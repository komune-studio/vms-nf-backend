import {NextFunction, Request, Response} from "express";
import fs from "fs";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import {BadRequestError, NotFoundError} from "../utils/error.utils";
import FaceImageDAO from "../daos/face_image.dao";
import EnrollmentService, {enrollmentFields} from "../services/enrollment.service";

export default class BlacklistController {
    static async createBlacklisted(req: Request, res: Response, next: NextFunction) {
        const file = req.file;
        if (!file) {
            return next(new BadRequestError("Image is required."));
        }

        try {
            const enrolledFace = await EnrollmentService.enroll({
                image: fs.readFileSync(file.path),
                name: req.body['name'],
                identity_number: req.body['identity_number'],
                status: "BLACKLIST",
                gender: req.body['gender'],
                birth_place: req.body['birth_place'],
                birth_date: req.body['birth_date'],
                additional_info: req.body['additional_info']
            });

            res.send({
                message: "successfully enrolled person",
                ok: true,
                enrollment: {...enrolledFace, face_id: enrolledFace.face_id.toString()}
            });
        } catch (e) {
            return next(e);
        } finally {
            fs.rmSync(file.path);
        }
    }

    static async getAllBlacklisted(req: Request, res: Response, next: NextFunction) {
        try {
            // @ts-ignore
            let result = await EnrolledFaceDAO.getAll(null, null, '', 'BLACKLIST')

            const faceImages = await FaceImageDAO.getByEnrolledFaceIds(result.map(row => row.id), true)

            result.forEach((row, idx) => {
                // @ts-ignore
                result[idx].faces = [];

                faceImages.forEach(data => {
                    console.log(BigInt(row.id))
                    console.log(data.enrolled_face_id)

                    // @ts-ignore
                    if(data.enrolled_face_id === BigInt(row.id)) {
                        const imageThumbnail = data.image_thumbnail ? {image_thumbnail: Buffer.from(data.image_thumbnail).toString('base64')} : {}

                        // @ts-ignore
                        result[idx].faces.push({...data, id: data.id.toString(), enrolled_face_id: data.enrolled_face_id.toString(), ...imageThumbnail})
                    }
                })
            })
            // console.log(result1)


            // result = result.results.enrollments.filter((item: any) => item.status === "BLACKLIST");
            res.send(result.map(data => ({...data, face_id: data.face_id.toString()})));
        } catch (e) {
            return next(e);
        }
    }

    static async getBlacklistedById(req: Request, res: Response, next: NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new BadRequestError("Invalid ID."));
        }

        try {
            const enrolledFace = await EnrolledFaceDAO.getById(id);

            if (!enrolledFace || enrolledFace.status !== "BLACKLIST") {
                return next(new NotFoundError("Face not found"));
            }

            res.send({
                message: "successfully get enrolled person",
                ok: true,
                enrollment: await EnrollmentService.serialize(enrolledFace)
            });
        } catch (e) {
            return next(e);
        }
    }

    static async updateBlacklisted(req: Request, res: Response, next: NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new BadRequestError("Invalid ID."));
        }

        try {
            const enrolledFace = await EnrolledFaceDAO.getById(id);

            if (!enrolledFace || enrolledFace.status !== "BLACKLIST") {
                return next(new NotFoundError("Face not found"));
            }

            const updated = await EnrolledFaceDAO.update(id, enrollmentFields(req.body, "BLACKLIST"));

            res.send({
                message: "successfully updated enrollment",
                ok: true,
                enrollment: await EnrollmentService.serialize(updated)
            });
        } catch (e) {
            return next(e);
        }
    }

    static async unblacklist(req: Request, res: Response, next: NextFunction) {

        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new BadRequestError("Invalid ID."));
        }
        try {
            let result = await EnrolledFaceDAO.unblacklist(id)
            res.send({success: true});
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }

    static async deleteBlacklisted(req: Request, res: Response, next: NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new BadRequestError("Invalid ID."));
        }

        try {
            const enrolledFace = await EnrolledFaceDAO.getById(id);

            if (!enrolledFace || enrolledFace.status !== "BLACKLIST") {
                return next(new NotFoundError("Face not found"));
            }

            await EnrollmentService.remove(enrolledFace);

            res.send({message: "successfully deleted enrollment", ok: true});
        } catch (e) {
            return next(e);
        }
    }
}
