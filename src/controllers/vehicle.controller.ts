import {NextFunction, Request, Response} from "express";
import VehicleDAO from "../daos/vehicle.dao";
import {BadRequestError, NotFoundError} from "../utils/error.utils";
import SecurityUtils from "../utils/security.utils";

export default class VehicleController {
    static async createVehicle(req : Request, res : Response, next : NextFunction) {
        try {
            const {plate_number, type, brand, color, name, status} = req.body;

            let body = {
                plate_number, type, brand, color, name, status,
                unique_id: SecurityUtils.generateId(),
            }
            let vehicle = await VehicleDAO.create(body);
            res.send({
                success: true,
                vehicle: {
                    ...vehicle,
                    id: vehicle.id.toString(),
                }
            })
        }
        catch (err) {
            return next(err);
        }
    }

    static async getAllVehicles(req : Request, res : Response, next : NextFunction) {
        try {
            let vehicles : any = await VehicleDAO.getVehicles();
            // @ts-ignore
            vehicles = vehicles.map(vehicle => ({...vehicle, id: vehicle.id.toString()}))
            res.send(vehicles);
        }
        catch (err) {
            return next(err);
        }
    }

    static async getVehicle(req : Request, res : Response, next : NextFunction) {
        let {id} = req.params;

        try {
            let vehicle = await VehicleDAO.getByUniqueId(id);

            if (vehicle === null) {
                return next(new NotFoundError("Vehicle not found.", "id"));
            }

            // @ts-ignore
            vehicle = {...vehicle, id: vehicle.id.toString()}
            res.send(vehicle);
        }
        catch (err) {
            return next(err);
        }
    }

    static async updateVehicle(req : Request, res : Response, next : NextFunction) {
        let {id} = req.params;

        try {
            let vehicle = await VehicleDAO.getByUniqueId(id);

            const {plate_number, type, brand, color, name, status} = req.body;

            const body = {
                plate_number, type, brand, color, name, status
            }

            if (vehicle === null) {
                return next(new NotFoundError("Vehicle not found.", "id"));
            }

            await VehicleDAO.updateVehicle(id, body);

            res.send({success: true});
        }
        catch (err) {
            return next(err);
        }
    }

    static async deleteVehicle(req : Request, res : Response, next : NextFunction) {
        let id = parseInt(req.params.id);
        if (isNaN(id)) {
            return next(new BadRequestError("Invalid id.", "id"));
        }

        try {
            let vehicle = await VehicleDAO.getVehicle(id);

            if (vehicle === null) {
                return next(new NotFoundError("Vehicle not found.", "id"));
            }

            await VehicleDAO.deleteVehicle(id);

            res.send({success: true});
        }
        catch (err) {
            return next(err);
        }
    }
}