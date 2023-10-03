// @ts-nocheck
import {NextFunction, Request, Response} from "express";
import SystemDAO from "../daos/system.dao";

export default class SystemController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await SystemDAO.getAll();

            res.send(result.map(data => ({...data, id: data.id.toString()})));
        } catch (e) {
            return next(e);
        }
    }
}
