import {NextFunction, Request, Response} from "express";
import request from "../utils/api.utils";

export default class FaceController {

    static async createFace(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'POST', req.body);
            res.send(result);
        } catch (e) {
            return next(e);
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
        } catch (e) {
            return next(e);
        }
    }

    static async updateFace(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'PUT', req.body);
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