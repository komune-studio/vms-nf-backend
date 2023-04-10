import {NextFunction, Request, Response} from "express";
import FormData from "form-data";
import fs from "fs";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import request, {requestWithFile} from "../utils/api.utils";
import {BadRequestError, NotFoundError} from "../utils/error.utils";

export default class BlacklistController {
    static async createBlacklisted(req: Request, res: Response, next: NextFunction) {
        const file = req.file;
        if (!file) {
            return next(new BadRequestError("Image is required."));
        }

        try {
            const body = new FormData();
            Object.keys(req.body).forEach(key => {
                if (key !== "status")
                    body.append(key, req.body[key]);
            });
            body.append('status', "BLACKLIST");
            body.append('images', fs.createReadStream(file.path));
            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'POST', body);
            res.send(result);
        } catch (e) {
            return next(e);
        } finally {
            fs.rmSync(file.path);
        }
    }

    static async getAllBlacklisted(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'GET');
            console.log(result);
            result = result.results.enrollments.filter((item: any) => item.status === "BLACKLIST");
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async getBlacklistedById(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'GET');
            if (result.status !== "BLACKLIST") {
                return next(new NotFoundError("Face not found"));
            }
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async updateBlacklisted(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            const body = new FormData();
            Object.keys(req.body).forEach(key => {
                if (key !== "status")
                    body.append(key, req.body[key]);
            });
            body.append('status', "BLACKLIST");
            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'PUT', body);
            res.send(result);
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
        const {id} = req.params;

        try {
            let face = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'GET');
            if (face.enrollment.status !== "BLACKLIST") {
                return next(new NotFoundError("Face not found"));
            }

            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'DELETE');
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }
}
