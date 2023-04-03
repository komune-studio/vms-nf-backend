import {NextFunction, Request, Response} from "express";
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
                enrolled_face_id: BigInt(enrolled_face_id),
                location_id: location_id ? location_id : null,
                employee_id: employee_id ? employee_id : null,
                allowed_sites: allowed_sites.map((site : any) => BigInt(site)),
                purpose: purpose,
            }
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
}