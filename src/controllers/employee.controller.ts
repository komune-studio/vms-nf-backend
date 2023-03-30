import {NextFunction, Request, Response} from "express";
import EmployeeDAO from "../daos/employee.dao";
import {BadRequestError} from "../utils/error.utils";

export default class EmployeeController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await EmployeeDAO.getAll();
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async getOne(req: Request, res: Response, next: NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadRequestError("Invalid ID"));

        try {
            let result = await EmployeeDAO.getOne(id);
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        const {name, position, phone_number} = req.body;
        try {
            let result = await EmployeeDAO.create({
                name: name,
                position: position,
                phone_number: phone_number,
            });
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadRequestError("Invalid ID"));

        const {name, position, phone_number} = req.body;
        try {
            let result = await EmployeeDAO.update(id, {
                name: name,
                position: position,
                phone_number: phone_number,
            });
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadRequestError("Invalid ID"));

        try {
            let result = await EmployeeDAO.update(id, {
                deleted_at: new Date()
            });
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }
}
