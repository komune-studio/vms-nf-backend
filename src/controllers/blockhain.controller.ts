import {NextFunction, Request, Response} from "express";
import request, {requestWithFile} from "../utils/api.utils";
import FormData from "form-data";
import fs from "fs";
import {BadRequestError} from "../utils/error.utils";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";

export default class BlockhainController {
    static async login() {
        try {
            let result = await request(`${process.env.TRACEABILITY_URL}/auth/login`, 'POST', {
                email: 'admin@admin.com',
                password: 'admin'
            });

            const {accessToken} = result.data;

            result = await request(`${process.env.TRACEABILITY_URL}/auth/profile`, 'GET', null, {
                Authorization: `Bearer ${accessToken}`
            });

            const {address} = result.data;

            return {accessToken, address};
        } catch (e) {
            console.log(e)
            throw e
        }

    }


    static async get(req: Request, res: Response, next: NextFunction) {
        try {
            const loginResult = await BlockhainController.login();

            let result = await request(`${process.env.TRACEABILITY_URL}/activity-log/all-activity?${new URLSearchParams({...req.query, address: loginResult.address})}`, 'GET', null, {
                Authorization: `Bearer ${loginResult.accessToken}`
            });

            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async create(action : string, detail : any) {
        try {
            const loginResult = await BlockhainController.login();

            let result = await request(`${process.env.TRACEABILITY_URL}/activity/create`, 'POST', {
                action,
                detail
            }, {
                Authorization: `Bearer ${loginResult.accessToken}`
            });

            return result;
        } catch (e) {
           console.log(e)
        }
    }
}
