import {NextFunction, Request, Response} from "express";
import LocationDAO from "../daos/location.dao";
import {BadRequestError} from "../utils/error.utils";

export default class LocationController {
    static async getAll(req : Request, res : Response, next : NextFunction) {
        try {
            let result = await LocationDAO.getAll();
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }
    static async getOne(req : Request, res : Response, next : NextFunction) {
        const id = parseInt(req.params.id);
        if (isNaN(id)) return next(new BadRequestError("Invalid ID"));

        try {
            let result = await LocationDAO.getOne(id);
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }
    static async create(req : Request, res : Response, next : NextFunction) {
        const {name} = req.body;
        try {
            let result = await LocationDAO.create({
                name: name,
                created_at: new Date(),
                modified_at: new Date(),
            });
            res.send(result);
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
            let result = await LocationDAO.delete(id);
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }
}