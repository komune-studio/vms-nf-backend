import {NextFunction, Request, Response} from "express";
import CustomizeFormDAO from "../daos/customized_form.dao";
import {BadRequestError} from "../utils/error.utils";

export default class CustomizedFormController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await CustomizeFormDAO.getAll();
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async getOne(req: Request, res: Response, next: NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadRequestError("Invalid ID"));

        try {
            let result = await CustomizeFormDAO.getOne(id);
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await CustomizeFormDAO.create(req.body);
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadRequestError("Invalid ID"));

        try {
            let result = await CustomizeFormDAO.update(id, req.body);
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    // static async delete(req: Request, res: Response, next: NextFunction) {
    //     const id = parseInt(req.params.id);
    //     if (isNaN(id)) return next(new BadRequestError("Invalid ID"));
    //
    //     try {
    //         let result = await EmployeeDAO.update(id, {
    //             deleted_at: new Date()
    //         });
    //         res.send(result);
    //     } catch (e) {
    //         return next(e);
    //     }
    // }
}
