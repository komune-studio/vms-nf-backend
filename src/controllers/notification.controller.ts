import {NextFunction, Request, Response} from "express";
import NotificationDAO from "../daos/notification.dao";
export default class SiteController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            let data = await NotificationDAO.getAll();

            res.send(data)
        } catch (err) {
            return next(err);
        }
    }
}
