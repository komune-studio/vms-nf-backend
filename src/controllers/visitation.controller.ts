import {NextFunction, Request, Response} from "express";
import FaceImageDAO from "../daos/face_image.dao";
import VisitationDAO from "../daos/visitation.dao";
import {BadRequestError} from "../utils/error.utils";

export default class VisitationController {
    static async createVisit(req : Request, res : Response, next : NextFunction) {
        const {enrolled_face_id, location_id, employee_id, allowed_sites, purpose} = req.body;
        if (!enrolled_face_id || !purpose) {
            return next(new BadRequestError(`Please specify: ${!enrolled_face_id ? "enrolled_face_id" : ""} ${!purpose ? "purpose" : ""}`));
        }

        try {
            let body = {
                enrolled_face_id: enrolled_face_id,
                location_id: location_id ? parseInt(location_id) : undefined,
                employee_id: employee_id ? parseInt(employee_id) : undefined,
                allowed_sites: allowed_sites.map((site : any) => BigInt(site)),
                purpose: purpose,
            }
            console.log(req.body, body)
            let result : any = await VisitationDAO.createVisit(body);
            result = {
                ...result,
                enrolled_face_id: result.enrolled_face_id.toString(),
                allowed_sites: result.allowed_sites.map((site : any) => site.toString()),
            }
            res.send(result);

        } catch (e) {
            return next(e);
        }
    }

    static async getAllVisits(req : Request, res : Response, next : NextFunction) {
        try {
            let {limit, page, search} = req.query;

            // @ts-ignore
            limit = parseInt(limit);

            // @ts-ignore
            page = parseInt(page);

            // @ts-ignore
            let result = await VisitationDAO.getAllVisits(limit, page, search);

            // @ts-ignore
            let count = await VisitationDAO.getVisitCount(search);

            // @ts-ignore
            const faceImages = await FaceImageDAO.getByEnrolledFaceIds(result.map(row => row.enrolled_face.id), true)

            result.forEach((row, idx) => {
                // @ts-ignore
                result[idx].enrolled_face.faces = [];

                faceImages.forEach(data => {
                    // @ts-ignore
                    if(data.enrolled_face_id === BigInt(row.enrolled_face.id)) {
                        const imageThumbnail = data.image_thumbnail ? {image_thumbnail: Buffer.from(data.image_thumbnail).toString('base64')} : {}

                        // @ts-ignore
                        result[idx].enrolled_face.faces.push({...data, id: data.id.toString(), enrolled_face_id: data.enrolled_face_id.toString(), ...imageThumbnail})
                    }
                })
                result[idx].allowed_sites = result[idx].allowed_sites.map((site : any) => site.toString());
            });

            // @ts-ignore
            const totalPage =  limit ? Math.ceil(count._count.id / limit) : 1;

            console.log(result)

            res.send({
                limit : limit ? limit : 0,
                current_page: page ? page : 1,
                total_data: count._count.id,
                total_page: totalPage,
                results: result,
            });
        } catch (e) {
            return next(e);
        }
    }

    static async checkClearance(req : Request, res : Response, next : NextFunction) {
        
    }
}