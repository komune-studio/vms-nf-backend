import {NextFunction, Request, Response} from "express";
import CaseDao from "../daos/case.dao";
import SiteDAO from "../daos/site.dao";
export default class CaseController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            let data = await CaseDao.getAll();

            res.send(data)
        } catch (err) {
            return next(err);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            let data = await CaseDao.getById(parseInt(req.params.id));

            res.send({data})
        } catch (err) {
            return next(err);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            let data = await CaseDao.create(req.body);
            res.send({
                success: true,
                data
            })
        } catch (err) {
            return next(err);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            await CaseDao.update(parseInt(req.params.id), req.body);
            res.send({success: true})
        } catch (err) {
            return next(err);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await CaseDao.update(parseInt(req.params.id), {deleted_at: new Date()});
            res.send({success: true})
        } catch (err) {
            return next(err);
        }
    }
}
