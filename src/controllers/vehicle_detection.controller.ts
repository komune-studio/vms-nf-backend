import {NextFunction, Request, Response} from "express";
import UserDAO from "../daos/user.dao";
import {BadRequestError, ConflictError, InvalidCredentialsError, UnauthorizedError} from "../utils/error.utils";
import VehicleDetectionDAO from "../daos/vehicle_detection.dao";
import SecurityUtils from "../utils/security.utils";
import SiteDAO from "../daos/site.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import jwt from "jsonwebtoken";
import fs from "fs";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import FaceImageDAO from "../daos/face_image.dao";
import DetectionDAO from "../daos/detection.dao";

export default class DetectionController {
    static async create(req: Request, res: Response, next: NextFunction) {

        try {
            // @ts-ignore
            await VehicleDetectionDAO.create({...req.body, image: Buffer.from(req.body.image, 'base64'), user_id: req.decoded.id, vehicle_id: BigInt(req.body.vehicle_id)});
            res.send({
                success: true
            })
        } catch (err) {
            console.log(err)

            return next(err);
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const {vehicle_id, case_id, search, user_id, start_date, end_date, id} = req.query;

            console.log({
                vehicle_id, case_id, search, user_id, start_date, end_date, id
            })

            // @ts-ignore
            const data = await VehicleDetectionDAO.getAll(vehicle_id, case_id, search, user_id, start_date, end_date, id)

            // @ts-ignore
            res.send(data.map(item => ({...item, vehicle_id: parseInt(item.vehicle_id), image: Buffer.from(item.image).toString('base64')})))
        } catch (err) {
            console.log(err)

            return next(err);
        }
    }
}