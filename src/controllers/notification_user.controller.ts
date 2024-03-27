import {NextFunction, Request, Response} from "express";
import NotificationUserDAO from "../daos/notification_user.dao";
export default class NotificationUserController {
    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            let data = await NotificationUserDAO.getByAdminId(req.decoded.id);

            res.send(data)
        } catch (err) {
            return next(err);
        }
    }

    static async markRead(req: Request, res: Response, next: NextFunction) {
        try {
            let data = await NotificationUserDAO.markRead(req.decoded.id, parseInt(req.params.id));

            res.send(data)
        } catch (err) {
            return next(err);
        }
    }

    static async markAllAsRead(req: Request, res: Response, next: NextFunction) {
        try {
            let data = await NotificationUserDAO.markAllAsRead(req.decoded.id);

            res.send(data)
        } catch (err) {
            return next(err);
        }
    }
}
