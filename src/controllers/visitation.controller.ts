import {NextFunction, Request, Response} from "express";
import FaceImageDAO from "../daos/face_image.dao";
import SiteDAO from "../daos/site.dao";
import VisitEventDAO from "../daos/visit_event.dao";
import VisitationDAO from "../daos/visitation.dao";
import {BadRequestError, NotFoundError} from "../utils/error.utils";
import SiteController from "./site.controller";
const json2csv = require('json2csv').parse;

export default class VisitationController {
    static async createVisit(req : Request, res : Response, next : NextFunction) {
        const {enrolled_face_id, location_id, employee_id, allowed_sites, purpose, security_id} = req.body;
        if (!purpose) {
            return next(new BadRequestError(`Please specify: ${!enrolled_face_id ? "enrolled_face_id" : ""} ${!purpose ? "purpose" : ""}`));
        }

        try {
            let body = {
                enrolled_face_id: enrolled_face_id,
                location_id: location_id ? parseInt(location_id) : undefined,
                employee_id: employee_id ? parseInt(employee_id) : undefined,
                allowed_sites: allowed_sites.map((site : any) => BigInt(site)),
                purpose: purpose,
                security_id: security_id ? parseInt(security_id) : undefined
            }
            console.log(req.body, body)
            let result : any = await VisitationDAO.createVisit(body);
            result = {
                ...result,
                enrolled_face_id: result.enrolled_face_id ? result.enrolled_face_id.toString() : null,
                allowed_sites: result.allowed_sites.map((site : any) => site.toString()),
            }

            res.send(result);

        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getAllVisits(req : Request, res : Response, next : NextFunction) {
        try {
            let {limit, page, search, searchBy, start_date, end_date, start_time, end_time, gender, age, form, download} = req.query;

            // @ts-ignore
            limit = parseInt(limit);

            // @ts-ignore
            page = parseInt(page);

            // @ts-ignore
            let result = await VisitationDAO.getAllVisits(download ? null : limit, download ? null : page, search, searchBy, null, start_date, end_date, start_time, end_time, gender, age, form);


            if(download) {
                const fields = ['Identity Number', 'Name', 'Purpose', 'Location', 'Visit Time'];

                const docs = result.map(item => ({
                    identity_number: item.enrolled_face ? item.enrolled_face.identity_number : '',
                    name: item.enrolled_face ? item.enrolled_face.name : '',
                    purpose: item.purpose,
                    location: item.location ? item.location.name : '',
                    created_at: item.created_at
                }))

                console.log('hiii')
                console.log('docs', docs)

                const data = json2csv(docs, fields);

                res.attachment('visitor-history.csv');

                return res.send(data)
            }

            // @ts-ignore
            let count = await VisitationDAO.getVisitCount(search, searchBy, start_date, end_date, start_time, end_time, gender, age, form);

            // @ts-ignore
            const faceImages = await FaceImageDAO.getByEnrolledFaceIds(result.filter(row => row.enrolled_face).map(row => row.enrolled_face.id), true)

            const sites = await SiteDAO.getAll();

            result.forEach((row, idx) => {
                if(!row.enrolled_face) return

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

                // @ts-ignore
                result[idx].allowed_sites = result[idx].allowed_sites.map(site => sites.find(data => data.id.toString() === site.toString()));
            });

            // @ts-ignore
            const totalPage =  limit ? Math.ceil(count._count.id / limit) : 1;

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

    static async getByEventId(req : Request, res : Response, next : NextFunction) {
        const id = req.params.id;
        try {
            let visitEvent = await VisitEventDAO.getByEventId(id);
            if (visitEvent === null) {
                return next(new NotFoundError("Visit Event not found."));
            }
            if (visitEvent.visitation_id === null) {
                return res.send({});
            }
            let visitation = await VisitationDAO.getById(visitEvent.visitation_id);
            if (visitation === null) {
                return res.send({});
            }
            res.send({
                ...visitation,
                allowed_sites: visitation.allowed_sites.map((site : any) => site.toString()),
            })
        } catch (e) {
            return next(e);
        }
    }

    static async getById(req : Request, res : Response, next : NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new BadRequestError("Invalid id."));
        }
        try {
            let visitation = await VisitationDAO.getById(id);
            if (visitation === null) {
                return next(new NotFoundError("Visitation not found."));
            }
            res.send({
                ...visitation,
                allowed_sites: visitation.allowed_sites.map((site : any) => site.toString()),
            })
        } catch (e) {
            return next(e);
        }
    }

    static async updateVisit(req : Request, res : Response, next : NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new BadRequestError("Invalid id."));
        }
        const {enrolled_face_id, location_id, employee_id, allowed_sites, purpose} = req.body;
        if (!purpose) {
            return next(new BadRequestError(`Please specify: ${!purpose ? "purpose" : ""}`));
        }
        try {
            let body = {
                enrolled_face_id: enrolled_face_id,
                location_id: location_id ? parseInt(location_id) : undefined,
                employee_id: employee_id ? parseInt(employee_id) : undefined,
                allowed_sites: allowed_sites.map((site : any) => BigInt(site)),
                purpose: purpose,
            }
            let result : any = await VisitationDAO.updateVisit(id, body);
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

    static async approve(req : Request, res : Response, next : NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new BadRequestError("Invalid id."));
        }

        try {
            let result : any = await VisitationDAO.approve(id, req.decoded.id);

            // @ts-ignore
            res.send({...result, allowed_sites: result.allowed_sites.map(data => parseInt(data))});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async checkOut(req : Request, res : Response, next : NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new BadRequestError("Invalid id."));
        }

        try {
            let result : any = await VisitationDAO.checkOut(id);

            // @ts-ignore
            res.send({...result, allowed_sites: result.allowed_sites.map(data => parseInt(data))});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
