// @ts-nocheck
import { NextFunction, Request, Response } from "express";
import request, { requestWithFile } from "../utils/api.utils";
import FormData from "form-data";
import fs from "fs";
import { BadRequestError, NotFoundError } from "../utils/error.utils";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import FremisnDAO from "../daos/fremisn.dao";
import RecognizedEventDAO from "../daos/recognized_event.dao";
import FaceImageDAO from "../daos/face_image.dao";
import SiteDAO from "../daos/site.dao";
import moment from "moment/moment";
import EventDAO from "../daos/event.dao";
import sharp from 'sharp';
import PrismaService from "../services/prisma.service";
const prisma = PrismaService.getFace();
const keyspace = process.env.NF_KEYSPACE

export default class FaceController {


    static async createFace(req: Request, res: Response, next: NextFunction) {
        const files = req.files;

        if (!req.body['name']) {
            return next(new BadRequestError("Name is required."));
        }
        if (Array.isArray(files) && files.length === 0) {
            return next(new BadRequestError("Image is required."));
        }

        try {
            // Step 1: Call face recognition API for each image
            const enrollmentResults: {
                face_id: string;
                variation: string;
                imageBuffer: Buffer;
                thumbnailBuffer: Buffer;  // tambah ini
            }[] = [];

            for (const file of files as Express.Multer.File[]) {
                const imageBuffer = fs.readFileSync(file.path);
                const base64Image = imageBuffer.toString('base64');

                const thumbnailBuffer = await sharp(imageBuffer)
                    .resize(200, 200, {
                        fit: 'inside',        // maintain aspect ratio, tidak crop
                        withoutEnlargement: true  // kalau gambar < 200x200, tidak di-upscale
                    })
                    .jpeg({ quality: 80 })   // compress juga sekalian
                    .toBuffer();

                const frResponse = await fetch(
                    `${process.env.NF_FREMISN_API_URL}/face/enrollment`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            image: base64Image,
                            keyspace,
                        }),
                    }
                );

                const frResult = await frResponse.json();

                if (!frResponse.ok) {
                    // Map face recognition error to 422
                    return next({
                        status: 422,
                        body: {
                            code: 'unprocessable-entity',
                            errors: [frResult.description ?? 'unrecognized Image Data'],
                            message: 'Error when trying to enrollment',
                            ok: false,
                        },
                    });
                }

                enrollmentResults.push({
                    face_id: frResult.face_id,
                    variation: frResult.variation,
                    imageBuffer,
                    thumbnailBuffer
                });
            }

            // Step 2: Save to DB via Prisma (use first face_id as the enrolled_face's face_id)
            const primaryResult = enrollmentResults[0];

            const additionalInfo = req.body.additional_info
                ? JSON.parse(req.body.additional_info)
                : {};

            const enrolledFace = await prisma.enrolled_face.create({
                data: {
                    name: req.body.name,
                    face_id: BigInt(primaryResult.face_id),
                    identity_number: req.body.identity_number ?? '',
                    gender: req.body.gender ?? '',
                    birth_place: req.body.birth_place ?? '',
                    birth_date: req.body.birth_date ? new Date(req.body.birth_date) : new Date('0001-01-01'),
                    status: req.body.status ?? '',
                    additional_info: additionalInfo,
                    face_images: {
                        create: enrollmentResults.map(({ variation, imageBuffer, thumbnailBuffer }) => ({
                            variation,
                            image: imageBuffer,
                            image_thumbnail: thumbnailBuffer, // replace with actual thumbnail logic if needed
                        })),
                    },
                },
                include: {
                    face_images: true,
                },
            });

            // Step 3: Format response to match deprecated API shape
            const responsePayload = {
                enrollment: {
                    id: Number(enrolledFace.id),
                    name: enrolledFace.name,
                    identity_number: enrolledFace.identity_number,
                    gender: enrolledFace.gender,
                    birth_place: enrolledFace.birth_place,
                    birth_date: enrolledFace.birth_date?.toISOString() ?? '0001-01-01',
                    status: enrolledFace.status,
                    created_at: enrolledFace.created_at.toISOString(),
                    updated_at: enrolledFace.updated_at.toISOString(),
                    deleted_at: enrolledFace.deleted_at,
                    face_id: Number(enrolledFace.face_id),
                    faces: enrolledFace.face_images.map(fi => ({
                        id: Number(fi.id),
                        variation: fi.variation,
                        image_thumbnail: fi.image_thumbnail?.toString('base64') ?? null,
                        created_at: fi.created_at.toISOString(),
                    })),
                },
                message: 'Successfully Enroll New Face',
                ok: true,
            };

            res.status(201).send(responsePayload);

        } catch (e) {
            console.log(e);
            return next(e);
        } finally {
            (files as Express.Multer.File[]).forEach(file => {
                fs.rmSync(file.path);
            });
        }
    }

    static async getFace(req: Request, res: Response, next: NextFunction) {
        try {
            const { search, page = 1, limit = 10 } = req.query;
            const pageNum = parseInt(page as string);
            const limitNum = parseInt(limit as string);
            const prisma = PrismaService.getFace();

            const where = {
                deleted_at: null,
                ...(search && {
                    OR: [
                        { name: { contains: search as string, mode: 'insensitive' as const } },
                        {
                            additional_info: {
                                path: ['plate_number'],
                                string_contains: search as string,
                            }
                        },
                    ],
                }),
            };

            // Step 1: Query dengan pagination & filter sekaligus
            const [enrollments, totalData] = await Promise.all([
                prisma.enrolled_face.findMany({
                    where,
                    skip: (pageNum - 1) * limitNum,
                    take: limitNum,
                    orderBy: { created_at: 'desc' },
                    include: {
                        face_images: {
                            where: { deleted_at: null },
                            select: {
                                id: true,
                                enrolled_face_id: true,
                                variation: true,
                                created_at: true,
                                image_thumbnail: true,
                            },
                        },
                    },
                }),
                prisma.enrolled_face.count({ where }),
            ]);

            // Step 2: Format response
            const formattedEnrollments = enrollments.map(enrollment => ({
                id: Number(enrollment.id),
                name: enrollment.name,
                identity_number: enrollment.identity_number,
                gender: enrollment.gender,
                birth_place: enrollment.birth_place,
                birth_date: enrollment.birth_date?.toISOString() ?? '0001-01-01',
                status: enrollment.status,
                created_at: enrollment.created_at.toISOString(),
                updated_at: enrollment.updated_at.toISOString(),
                deleted_at: enrollment.deleted_at,
                face_id: enrollment.face_id?.toString() ?? null,
                additional_info: enrollment.additional_info,
                faces: enrollment.face_images.map(fi => ({
                    id: Number(fi.id),
                    enrolled_face_id: Number(fi.enrolled_face_id),
                    variation: fi.variation,
                    created_at: fi.created_at.toISOString(),
                    image_thumbnail: fi.image_thumbnail      // tambah ini
                        ? Buffer.from(fi.image_thumbnail).toString('base64')
                        : null,
                })),
            }));

            res.send({
                total: totalData,
                page: pageNum,
                limit: limitNum,
                results: {
                    enrollments: formattedEnrollments,
                },
            });

        } catch (e) {
            return next(e);
        }
    }

    static async getFaceById(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const prisma = PrismaService.getFace();

        try {
            const enrollment = await prisma.enrolled_face.findFirst({
                where: { id: BigInt(id), deleted_at: null },
                include: {
                    face_images: {
                        where: { deleted_at: null },
                        select: {
                            id: true,
                            enrolled_face_id: true,
                            variation: true,
                            created_at: true,
                            image_thumbnail: true,
                        },
                    },
                },
            });

            if (!enrollment) {
                return next(new NotFoundError("Enrolled face not found.", "id"));
            }

            res.send({
                enrollment: {
                    id: Number(enrollment.id),
                    name: enrollment.name,
                    identity_number: enrollment.identity_number,
                    gender: enrollment.gender,
                    birth_place: enrollment.birth_place,
                    birth_date: enrollment.birth_date?.toISOString() ?? '0001-01-01',
                    status: enrollment.status,
                    created_at: enrollment.created_at.toISOString(),
                    updated_at: enrollment.updated_at.toISOString(),
                    deleted_at: enrollment.deleted_at,
                    face_id: enrollment.face_id?.toString() ?? null,
                    additional_info: enrollment.additional_info,
                    faces: enrollment.face_images.map(fi => ({
                        id: Number(fi.id),
                        enrolled_face_id: Number(fi.enrolled_face_id),
                        variation: fi.variation,
                        created_at: fi.created_at.toISOString(),
                        image_thumbnail: fi.image_thumbnail
                            ? Buffer.from(fi.image_thumbnail).toString('base64')
                            : null,
                    })),
                },
                message: 'successfully get enrolled person',
                ok: true,
            });

        } catch (e) {
            return next(e);
        }
    }

    static async updateFace(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const files = req.files as Express.Multer.File[];

        if (!req.body['name']) {
            return next(new BadRequestError("Name is required."));
        }

        const prisma = PrismaService.getFace();

        try {
            // Step 1: Ambil data lama
            const existingFace = await prisma.enrolled_face.findUnique({
                where: { id: BigInt(id) },
                include: { face_images: true },
            });

            if (!existingFace) {
                return next(new NotFoundError("Enrolled face not found.", "id"));
            }

            // Step 2: Delete enrollment lama di face recognition API (kalau ada gambar baru)
            let newFaceId = existingFace.face_id;
            const enrollmentResults: {
                face_id: string;
                variation: string;
                imageBuffer: Buffer;
                thumbnailBuffer: Buffer;
            }[] = [];

            if (files && files.length > 0) {
                // Delete face lama dulu
                await fetch(`${process.env.NF_FREMISN_API_URL}/face/delete-enrollment`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        keyspace,
                        face_ids: [existingFace.face_id.toString()],
                    }),
                });

                // Step 3: Re-enroll gambar baru
                for (const file of files) {
                    const imageBuffer = fs.readFileSync(file.path);
                    const base64Image = imageBuffer.toString('base64');

                    const thumbnailBuffer = await sharp(imageBuffer)
                        .resize(200, 200, {
                            fit: 'inside',
                            withoutEnlargement: true,
                        })
                        .jpeg({ quality: 80 })
                        .toBuffer();

                    const frResponse = await fetch(
                        `${process.env.NF_FREMISN_API_URL}/face/enrollment`,
                        {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                image: base64Image,
                                keyspace,
                            }),
                        }
                    );

                    const frResult = await frResponse.json();

                    if (!frResponse.ok) {
                        return next({
                            status: 422,
                            body: {
                                code: 'unprocessable-entity',
                                errors: [frResult.description ?? 'unrecognized Image Data'],
                                message: 'Error when trying to enrollment',
                                ok: false,
                            },
                        });
                    }

                    enrollmentResults.push({
                        face_id: frResult.face_id,
                        variation: frResult.variation,
                        imageBuffer,
                        thumbnailBuffer,
                    });
                }

                newFaceId = BigInt(enrollmentResults[0].face_id);
            }

            // Step 4: Update DB
            const additionalInfo = req.body.additional_info
                ? JSON.parse(req.body.additional_info)
                : undefined;

            const updatedFace = await prisma.enrolled_face.update({
                where: { id: BigInt(id) },
                data: {
                    name: req.body.name,
                    face_id: newFaceId,
                    identity_number: req.body.identity_number ?? existingFace.identity_number,
                    gender: req.body.gender ?? existingFace.gender,
                    birth_place: req.body.birth_place ?? existingFace.birth_place,
                    birth_date: req.body.birth_date ? new Date(req.body.birth_date) : existingFace.birth_date,
                    status: req.body.status ?? existingFace.status,
                    ...(additionalInfo && { additional_info: additionalInfo }),
                    // Kalau ada gambar baru, hapus lama & insert baru
                    ...(enrollmentResults.length > 0 && {
                        face_images: {
                            deleteMany: {},  // hapus semua face_image lama
                            create: enrollmentResults.map(({ variation, imageBuffer, thumbnailBuffer }) => ({
                                variation,
                                image: imageBuffer,
                                image_thumbnail: thumbnailBuffer,
                            })),
                        },
                    }),
                },
                include: {
                    face_images: true,
                },
            });

            // Step 5: Format response - hanya return field yang di-update
            const updatedFields: Record<string, any> = {};

            if (req.body.name) updatedFields.name = updatedFace.name;
            if (req.body.identity_number) updatedFields.identity_number = updatedFace.identity_number;
            if (req.body.gender) updatedFields.gender = updatedFace.gender;
            if (req.body.birth_place) updatedFields.birth_place = updatedFace.birth_place;
            if (req.body.birth_date) updatedFields.birth_date = updatedFace.birth_date?.toISOString() ?? null;
            if (req.body.status) updatedFields.status = updatedFace.status;
            if (req.body.additional_info) updatedFields.additional_info = updatedFace.additional_info;
            if (enrollmentResults.length > 0) {
                updatedFields.face_id = Number(updatedFace.face_id);
                updatedFields.faces = updatedFace.face_images.map(fi => ({
                    id: Number(fi.id),
                    variation: fi.variation,
                    image_thumbnail: fi.image_thumbnail?.toString('base64') ?? null,
                    created_at: fi.created_at.toISOString(),
                }));
            }

            const responsePayload = {
                enrollment: updatedFields,
                message: 'succesfully update enrolled person',
                ok: true,
            };

            res.send(responsePayload);
        } catch (e) {
            console.log(e);
            return next(e);
        } finally {
            files?.forEach(file => {
                try {
                    fs.rmSync(file.path);
                } catch (e) {
                    console.log(e);
                }
            });
        }
    }

    static async deleteFace(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;
        const prisma = PrismaService.getFace();

        try {
            // Step 1: Get enrolled face by id
            const existingFace = await prisma.enrolled_face.findUnique({
                where: { id: BigInt(id) },
            });

            if (!existingFace) {
                return next(new NotFoundError("Enrolled face not found.", "id"));
            }

            // Step 2: Delete enrollment di face recognition API
            await fetch(`${process.env.NF_FREMISN_API_URL}/face/delete-enrollment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    keyspace,
                    face_ids: [existingFace.face_id.toString()],
                }),
            });

            // Step 3: Soft delete - update deleted_at di enrolled_face & face_images
            const now = new Date();

            await prisma.enrolled_face.update({
                where: { id: BigInt(id) },
                data: {
                    deleted_at: now,
                    face_images: {
                        updateMany: {
                            where: { deleted_at: null },
                            data: { deleted_at: now },
                        },
                    },
                },
            });

            res.send({
                message: 'Successfully deleted enrolled face',
                ok: true,
            });

        } catch (e) {
            console.log(e);
            return next(e);
        }
    }

    static async getFaceExcludeDssIds(req: Request, res: Response, next: NextFunction) {
        const { ids } = req.query;

        try {
            const response = await EnrolledFaceDAO.getFaceExcludeDssIds(ids?.toString())

            res.send({ data: response.map(e => parseInt(e.id)) });
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }

    static async deleteByDssId(req: Request, res: Response, next: NextFunction) {
        const { id } = req.params;

        try {
            const enrollment = await EnrolledFaceDAO.getFaceByDssId(id)

            if (enrollment.length === 0) {
                return next(new NotFoundError("Enrollment not found.", "id"));
            }

            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${parseInt(enrollment[0].id)}`, 'DELETE');
            res.send(result);
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }

    static async faceRecognition(req: Request, res: Response, next: NextFunction) {
        const { image, limit } = req.body;

        try {

            const response = await FremisnDAO.faceRecognition(keyspace, image, parseInt(limit));

            const { candidates } = response.result.face_recognition;

            if (candidates.length === 0) return res.send([])

            for (const candidate of candidates) {
                const enrollment = await EnrolledFaceDAO.getByFaceId(candidate.face_id)

                if (enrollment) {
                    const faceImage = await FaceImageDAO.getThumbnailByEnrolledFaceIds([parseInt(enrollment.id)])

                    enrollment.image_thumbnail = Buffer(faceImage[0].image_thumbnail).toString('base64')

                    if (candidate.face_id === enrollment.face_id.toString()) {
                        candidate.enrollment = { ...enrollment, id: enrollment.id.toString(), face_id: enrollment.face_id.toString() }
                    }
                }
            }

            res.send(candidates)
        } catch (err) {
            console.log('isi errornya', err)
            try {
                const error = await err.json()

                return res.status(error.code).send(error)
            } catch (e) {
                return next(err);
            }
        }
    }

    static async getFacesByDssIds(req: Request, res: Response, next: NextFunction) {
        const { ids } = req.query;

        try {
            let response = await EnrolledFaceDAO.getFacesByDssIds(ids?.toString())

            let sites = await SiteDAO.getAll();

            for (const idx in response) {
                let siteAccess = [];

                if (response[idx].additional_info.site_access) {
                    for (const access of response[idx].additional_info.site_access) {
                        for (const site of sites) {
                            if (site.id === access) {
                                console.log(site)

                                siteAccess.push(site)
                            }
                        }
                    }
                }
                response[idx].id = parseInt(response[idx].id)
                response[idx].face_id = response[idx].face_id.toString();
                response[idx].additional_info.site_access = siteAccess
            }

            res.send({ data: response });
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }

    static async getAllFaces(req: Request, res: Response, next: NextFunction) {
        let { keyword, status, page, limit, start_date, end_date } = req.query;

        try {
            const startDate = start_date ? moment(new Date(start_date)).format('YYYY-MM-DDTHH:mm:00Z') : null;
            const endDate = end_date ? moment(new Date(end_date)).format('YYYY-MM-DDTHH:mm:00Z') : null;

            // @ts-ignore
            let data = await EnrolledFaceDAO.getAllWithPagination(keyword, status, startDate, endDate, parseInt(page), parseInt(limit));

            // @ts-ignore
            let count = await EnrolledFaceDAO.getCountWithPagination(keyword, status, startDate, endDate);

            const faceImages = await FaceImageDAO.getThumbnailByEnrolledFaceIds(data.map(item => parseInt(item.id)))

            for (const idx in data) {
                for (const image of faceImages) {
                    if (parseInt(data[idx].id) === parseInt(image.enrolled_face_id)) {
                        data[idx].id = data[idx].id.toString()
                        data[idx].face_id = data[idx].face_id.toString()

                        data[idx].image_thumbnail = Buffer.from(image.image_thumbnail).toString('base64')
                    }
                }
            }

            // @ts-ignore
            res.send({
                total_page: Math.floor(((parseInt(count[0].count) - 1) / limit) + 1),
                total_data: parseInt(count[0].count),
                data
            });
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }

    static async getByFaceIds(req: Request, res: Response, next: NextFunction) {
        try {
            let { face_ids } = req.params;

            // @ts-ignore
            let result = await EnrolledFaceDAO.getByFaceIds(JSON.parse(face_ids).map(id => BigInt(id)))

            const faceImages = await FaceImageDAO.getByEnrolledFaceIds(result.map(row => row.id), true)

            result.forEach((row, idx) => {
                // @ts-ignore
                result[idx].faces = [];

                faceImages.forEach(data => {
                    // @ts-ignore
                    if (data.enrolled_face_id === BigInt(row.id)) {
                        const imageThumbnail = data.image_thumbnail ? { image_thumbnail: Buffer.from(data.image_thumbnail).toString('base64') } : {}

                        // @ts-ignore
                        result[idx].faces.push({ ...data, id: data.id.toString(), enrolled_face_id: data.enrolled_face_id.toString(), ...imageThumbnail })
                    }
                })
            })

            res.send(result.map(data => ({ ...data, face_id: data.face_id.toString() })))
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }
}