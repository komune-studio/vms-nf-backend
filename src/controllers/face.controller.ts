import {NextFunction, Request, Response} from "express";
import FormData from "form-data";
import fs from "fs";
import request, {requestWithFile} from "../utils/api.utils";
import {BadRequestError} from "../utils/error.utils";

export default class FaceController {

    static async createFace(req: Request, res: Response, next: NextFunction) {
        const file = req.file;
        if (!file) {
            return next(new BadRequestError("Image is required."));
        }

        try {
            const body = new FormData();
            Object.keys(req.body).forEach(key => {
                body.append(key, req.body[key]);
            });
            body.append('images', fs.createReadStream(file.path));
            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'POST', body);
            res.send(result);
        } catch (e) {
            return next(e);
        } finally {
            fs.rmSync(file.path);
        }
    }

    static async getFace(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'GET');
            console.log(result);
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async getFaceById(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'GET');
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async updateFace(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            const body = new FormData();
            Object.keys(req.body).forEach(key => {
                body.append(key, req.body[key]);
            });
            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'PUT', body);
            res.send(result);
        } catch (e) {
            return next(e);
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
}
