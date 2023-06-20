import {NextFunction, Request, Response} from "express";
import LocationDAO from "../daos/location.dao";
import {BadRequestError} from "../utils/error.utils";
import EmployeeDAO from "../daos/employee.dao";

export default class LocationController {
    static async getAll(req : Request, res : Response, next : NextFunction) {
        try {
            let result = await LocationDAO.getAll();
            // @ts-ignore
            res.send(result.map(data => ({...data, site_id: parseInt(data.site_id)})));
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }
    static async getOne(req : Request, res : Response, next : NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadRequestError("Invalid ID"));

        try {
            let result = await LocationDAO.getOne(id);

            // @ts-ignore
            res.send({...result, site_id: parseInt(result.site_id)} );
        } catch (e) {
            return next(e);
        }
    }
    static async create(req : Request, res : Response, next : NextFunction) {
        const {name, site_id} = req.body;
        try {
            let result = await LocationDAO.create({
                name: name,
                site_id: parseInt(site_id),
                created_at: new Date(),
                modified_at: new Date(),
            });

            // @ts-ignore
            res.send({...result, site_id: parseInt(result.site_id)});
        } catch (e) {
            return next(e);
        }
    }
    static async update(req : Request, res : Response, next : NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadRequestError("Invalid ID"));

        const {name} = req.body;
        try {
            let result = await LocationDAO.update(id, {
                name: name,
                modified_at: new Date(),
            });
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }
    static async delete(req : Request, res : Response, next : NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadRequestError("Invalid ID"));

        try {
            let result = await LocationDAO.update(id, {
                deleted_at: new Date()
            });

            // @ts-ignore
            res.send({...result, site_id: parseInt(result.site_id)});
        } catch (e) {
            return next(e);
        }
    }
}
