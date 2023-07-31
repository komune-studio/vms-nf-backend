import {NextFunction, Request, Response} from "express";
import FormData from "form-data";
import fs from "fs";
import moment from "moment";
import VisitationDAO from "../daos/visitation.dao";
import request, {requestWithFile} from "../utils/api.utils";
import {BadRequestError, ConflictError, NotFoundError} from "../utils/error.utils";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import FaceImageDAO from "../daos/face_image.dao";
import SiteDAO from "../daos/site.dao";
import AdminDAO from "../daos/admin.dao";
const json2csv = require('json2csv').parse;

export default class FaceController {

    static async createFace(req: Request, res: Response, next: NextFunction) {
        const file = req.file;
        if (!file) {
            return next(new BadRequestError("Image is required."));
        }

        if (!req.body['identity_number']) {
            return next(new BadRequestError("Identity number is required."));
        }

        if (!req.body['name']) {
            return next(new BadRequestError("Name is required."));
        }

        const enrollment = await EnrolledFaceDAO.getByIdentityNumber(req.body['identity_number'])

        if(enrollment) {
            return next(new ConflictError(`Face with identity number: ${req.body['identity_number']} has been registered.`));
        }

        try {
            const body = new FormData();
            Object.keys(req.body).forEach(key => {
                body.append(key, req.body[key]);
            });
            body.append('images', fs.createReadStream(file.path));


            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'POST', body);


            if(result.ok) {
                // @ts-ignore
                await EnrolledFaceDAO.updateAdditionalInfo(result.enrollment.id, req.body.additional_info);
            }

            res.send(result);
        } catch (e) {
            console.log(e)
            return next(e);
        } finally {
            fs.rmSync(file.path);
        }
    }

    static async getByFaceIds(req: Request, res: Response, next: NextFunction) {
        try {
            let {face_ids} = req.params;

            // @ts-ignore
            let result = await EnrolledFaceDAO.getByFaceIds(JSON.parse(face_ids).map(id => BigInt(id)))

            const faceImages = await FaceImageDAO.getByEnrolledFaceIds(result.map(row => row.id), true)

            result.forEach((row, idx) => {
                // @ts-ignore
                result[idx].faces = [];

                faceImages.forEach(data => {
                    // @ts-ignore
                    if(data.enrolled_face_id === BigInt(row.id)) {
                        const imageThumbnail = data.image_thumbnail ? {image_thumbnail: Buffer.from(data.image_thumbnail).toString('base64')} : {}

                        // @ts-ignore
                        result[idx].faces.push({...data, id: data.id.toString(), enrolled_face_id: data.enrolled_face_id.toString(), ...imageThumbnail})
                    }
                })
            })

            res.send(result.map(data => ({...data, face_id: data.face_id.toString()})))
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }

    static async getFace(req: Request, res: Response, next: NextFunction) {
        try {
            let {limit, page, search, status, active, start_date, end_date, start_time, end_time, gender, age, download, type} = req.query;
            // @ts-ignore
            limit = parseInt(limit);

            // @ts-ignore
            page = parseInt(page);

            if(active) {
                // @ts-ignore
                active = active !== 'false'
            }

            let visitData = await VisitationDAO.getAllVisits(undefined, undefined, undefined, undefined, true, undefined, undefined, undefined, undefined, undefined, undefined, undefined, undefined);

            if(active !== undefined) {
                visitData = visitData.filter(data => active
                    ? moment(data.created_at).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD') && !data.check_out_at
                    : moment(data.created_at).format('YYYY-MM-DD') !== moment().format('YYYY-MM-DD') || data.check_out_at)
            }

            if(type === 'member') {
                visitData = visitData.filter(data => !data.employee && !data.security_id)
            } else if (type === 'non-member') {
                visitData = visitData.filter(data => data.employee)
            }

            const ids = visitData.filter(data => data.enrolled_face).map(data => data.enrolled_face?.id)

            // @ts-ignore
            let result = await EnrolledFaceDAO.getAll(download ? null : limit, download ? null : page, search, status, active, ids, start_date, end_date, start_time, end_time, gender, age)

            if(download) {
                const fields = ['Created At', 'Identity Number', 'Name', 'Gender', 'Birth Place', 'Birth Date'];

                const docs = result.map(item => ({
                    created_at: item.created_at,
                    identity_number: item.identity_number,
                    name: item.name,
                    gender: item.gender,
                    birth_place: item.birth_place,
                    birth_date: item.birth_date
                }))

                const data = json2csv(docs, fields);

                res.attachment('face-enrollment.csv');

                return res.send(data)
            }

            // @ts-ignore
            let count = await EnrolledFaceDAO.getCount(search, status, active, ids, start_date, end_date, start_time, end_time, gender, age)

            const faceImages = await FaceImageDAO.getByEnrolledFaceIds(result.map(row => row.id), !active)

            const sites = await SiteDAO.getAll();

            for(const idx in result) {
                const row = result[idx];

                    visitData.forEach(data => {
                        // @ts-ignore
                        if(data.enrolled_face && row.id === data.enrolled_face.id) {
                            // @ts-ignore
                            result[idx].employee = data.employee;
                            // @ts-ignore
                            result[idx].location = data.location;

                            if(moment(data.created_at).format('YYYY-MM-DD') !== moment().format('YYYY-MM-DD') || data.check_out_at) return;

                            // @ts-ignore
                            result[idx].visit_id = data.id;
                            // @ts-ignore
                            result[idx].approved = data.approved;

                            // @ts-ignore
                            result[idx].check_out_at = data.check_out_at;

                            // @ts-ignore
                            result[idx].registered_by = data.registered_by;

                            // @ts-ignore
                            result[idx].security_id = data.security_id;

                            // @ts-ignore
                            result[idx].created_at = data.created_at;

                            // @ts-ignore
                            result[idx].approved_by = data.approved_by;

                            // @ts-ignore
                            result[idx].approved_at = data.approved_at;


                            // @ts-ignore
                            result[idx].allowed_sites = data.allowed_sites.map(site => sites.find(data => data.id.toString() === site.toString()));
                        }
                    })


                // @ts-ignore
                result[idx].faces = [];

                faceImages.forEach(data => {
                    // @ts-ignore
                    if(data.enrolled_face_id === BigInt(row.id)) {
                        const imageThumbnail = data.image_thumbnail ? {image_thumbnail: Buffer.from(data.image_thumbnail).toString('base64')} : {}

                        // @ts-ignore
                        result[idx].faces.push({...data, id: data.id.toString(), enrolled_face_id: data.enrolled_face_id.toString(), ...imageThumbnail})
                    }
                })
            }

            const enrollments = result.map(row => ({...row, face_id: row.face_id.toString()}));

            // @ts-ignore
            const totalPage =  limit ? Math.ceil(count._count.id / limit) : 1;

            res.send({
                message: "successfully get enrolled person",
                ok: true,
                results: {
                    limit : limit ? limit : 0,
                    current_page: page ? page : 1,
                    total_data: count._count.id,
                    total_page: totalPage,
                    enrollments
                }
            });
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }

    static async getFaceById(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'GET');

            if(result.ok) {
                let response = await EnrolledFaceDAO.getAdditionaInfo(result.enrollment.id);

                // @ts-ignore
                result.enrollment.additional_info = response.additional_info;
            }

            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async updateFace(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;
        const {file} = req;

        if (!req.body['identity_number']) {
            return next(new BadRequestError("Identity number is required."));
        }

        if (!req.body['name']) {
            return next(new BadRequestError("Name is required."));
        }

        const enrollment = await EnrolledFaceDAO.getByIdentityNumber(req.body['identity_number'])

        // @ts-ignore
        if(enrollment && parseInt(id) !== enrollment.id) {
            return next(new ConflictError(`Face with identity number: ${req.body['identity_number']} has been registered.`));
        }

        try {
            const body = new FormData();
            Object.keys(req.body).forEach(key => {
                body.append(key, req.body[key]);
            });
            if(file) {
                body.append('images', fs.createReadStream(file.path));
            }

            await EnrolledFaceDAO.updateAdditionalInfo(parseInt(id), req.body.additional_info);

            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'PUT', body);

            res.send(result);
        } catch (e) {
            return next(e);
        }  finally {
            if(file) {
                fs.rmSync(file.path);
            }
        }
    }

    static async deleteFace(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'DELETE');
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async getByBookingNo(req: Request, res: Response, next: NextFunction) {
        const {booking_no} = req.params;

        const enrolledFace = await EnrolledFaceDAO.getByBookingNo(parseInt(booking_no));

        if (enrolledFace === null) {
            return res.send({enrollment: null})
        }

        const latestVisitData = await VisitationDAO.getLatestByEnrolledFaceId(enrolledFace.id);
        const faceImages = await FaceImageDAO.getByEnrolledFaceId(enrolledFace.id);

        // @ts-ignore
        const faces = [];

        faceImages.forEach(data => {
            faces.push(Buffer.from(data.image).toString('base64'))
        })

        // @ts-ignore
        res.send({enrollment: {...enrolledFace, faces, face_id: parseInt(enrolledFace.face_id)}, latest_visit_data: {...latestVisitData, allowed_sites: latestVisitData.allowed_sites.map(data => parseInt(data))}})
    }

    static async getByIdentityNumber(req: Request, res: Response, next: NextFunction) {
        const {identity_number} = req.params;

        const enrolledFace = await EnrolledFaceDAO.getByIdentityNumber(identity_number);

        if (enrolledFace === null) {
            return res.send({enrollment: null})
        }

        const latestVisitData = await VisitationDAO.getLatestByEnrolledFaceId(enrolledFace.id);
        const faceImages = await FaceImageDAO.getByEnrolledFaceId(enrolledFace.id);

        // @ts-ignore
        const faces = [];

        faceImages.forEach(data => {
            faces.push(Buffer.from(data.image).toString('base64'))
        })

        // @ts-ignore
        res.send({enrollment: {...enrolledFace, faces, face_id: parseInt(enrolledFace.face_id)}, latest_visit_data: {...latestVisitData, allowed_sites: latestVisitData.allowed_sites.map(data => parseInt(data))}})
    }

    static async reenroll(req: Request, res: Response, next: NextFunction) {
        const {identity_number} = req.body;
        const {file} = req;

        try {
            const enrolledFace = await EnrolledFaceDAO.getByIdentityNumber(identity_number);

            if (enrolledFace === null) {
                return next(new NotFoundError("Enrollment not found.", "identity_number"));
            }

            if(!file) {
                return next(new BadRequestError("Image is required."));
            }

            await EnrolledFaceDAO.recover(enrolledFace.id)

            const faceImages = await FaceImageDAO.getByEnrolledFaceId(enrolledFace.id);

            const body = new FormData();

            for(const data of faceImages) {
                body.append('deleted_variations', data.variation);
            }

            body.append('images', fs.createReadStream(file.path));
            body.append('identity_number', enrolledFace.identity_number);
            body.append('name', enrolledFace.name);
            body.append('status', enrolledFace.status);
            if(enrolledFace.gender) body.append('gender', enrolledFace.gender);
            if(enrolledFace.birth_place) body.append('birth_place', enrolledFace.birth_place);
            body.append('birth_date', moment(enrolledFace.birth_date).format('YYYY-MM-DD'));

            await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment/${enrolledFace.id}`, 'PUT', body);

            res.send({success: true});
        } catch (e) {
            console.log(e)

            return next(e);
        } finally {
            if(file) {
                fs.rmSync(file.path);
            }
        }
    }

    static async blacklistFace(req: Request, res: Response, next: NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new BadRequestError("Invalid ID."));
        }

        try {
            let result = await EnrolledFaceDAO.blacklist(id)
            res.send({success: true});
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }

    static async whitelistFace(req: Request, res: Response, next: NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new BadRequestError("Invalid ID."));
        }

        try {
            let result = await EnrolledFaceDAO.whitelist(id)
            res.send({success: true});
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }

    static async faceMatch(req: Request, res: Response, next: NextFunction) {
        try {
            const response = await request(`${process.env.NF_FREMISN_API_URL}/face/match`, 'POST', req.body);

            res.send(response);
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }
}
