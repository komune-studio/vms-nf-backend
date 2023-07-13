import {NextFunction, Request, Response} from "express";
import UserDAO from "../daos/user.dao";
import {BadRequestError, ConflictError, InvalidCredentialsError, UnauthorizedError} from "../utils/error.utils";
import CustomLogoDAO from "../daos/custom_logo.dao";
import SecurityUtils from "../utils/security.utils";
import SiteDAO from "../daos/site.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import jwt from "jsonwebtoken";
import fs from "fs";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import FaceImageDAO from "../daos/face_image.dao";
import DetectionDAO from "../daos/detection.dao";
import {fsUnlink} from "../utils/fs.utils";

export default class CustomLogoController {
    static async create(req: Request, res: Response, next: NextFunction) {
        const {file} = req;

        try {
            const data = await CustomLogoDAO.getAll();

            if(data) {
                await CustomLogoDAO.update({height: parseInt(req.body.height), image : file ? fs.readFileSync(file.path) : undefined});
            } else {
                await CustomLogoDAO.create({height: parseInt(req.body.height), image : file ? fs.readFileSync(file.path) : undefined});
            }

            res.send({
                success: true
            })
        } catch (err) {
            console.log(err)

            return next(err);
        } finally {
            if(file) {
                // @ts-ignore
                await fsUnlink(file.path)
            }
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await CustomLogoDAO.getAll()

            // @ts-ignore
            res.send(data ? {...data, image: Buffer.from(data.image).toString('base64')} : {})
        } catch (err) {
            console.log(err)

            return next(err);
        }
    }
}
