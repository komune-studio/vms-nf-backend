import {NextFunction, Request, Response} from "express";
import UserDAO from "../daos/user.dao";
import {BadRequestError, ConflictError, InvalidCredentialsError, UnauthorizedError} from "../utils/error.utils";
import DetectionDAO from "../daos/detection.dao";
import SecurityUtils from "../utils/security.utils";
import SiteDAO from "../daos/site.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import jwt from "jsonwebtoken";
import fs from "fs";

export default class DetectionController {
    static async create(req: Request, res: Response, next: NextFunction) {

        try {
            // @ts-ignore
            await DetectionDAO.create({...req.body, image: Buffer.from(req.body.image, 'base64'), user_id: req.decoded.id});
            res.send({
                success: true
            })
        } catch (err) {
            console.log(err)

            return next(err);
        }
    }
}
