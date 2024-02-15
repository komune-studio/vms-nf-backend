import {NextFunction, Request, Response} from "express";
import CustomStatusDAO from "../daos/custom_status.dao";
import {NotFoundError} from "../utils/error.utils";

export default class CustomStatusController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            let data : any = (await CustomStatusDAO.getAll());

            console.log(data)

            // @ts-ignore
            res.send(data.map(item  => ({...item, id: parseInt(item.id)})));
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        let id = parseInt(req.params.id);

        try {
            let customStatus = await CustomStatusDAO.getById(id);

            // @ts-ignore
            res.send(customStatus ? {...customStatus, id: parseInt(customStatus.id)} : {});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async create(req : Request, res : Response, next : NextFunction) {
        try {
            let result = await CustomStatusDAO.create(req.body);
            res.send({success: true})
        }
        catch (err) {
            return next(err);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        let id = parseInt(req.params.id);

        try {
            let customStatus = await CustomStatusDAO.getById(id);

            if (!customStatus) {
                return next(new NotFoundError("Custom Status not found.", "id"));
            }

            await CustomStatusDAO.update(id, req.body);

            res.send({success: true});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
