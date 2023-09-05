import {ca} from "date-fns/locale";
import {NextFunction, Request, Response} from "express";
import PatrolCarsDAO from "../daos/patrol_cars.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import PipelineDAO from "../daos/pipeline.dao";
import request from "../utils/api.utils";
import {NotFoundError} from "../utils/error.utils";
import PrismaService from "../services/prisma.service";
import SecurityUtils from "../utils/security.utils";
import VehicleDAO from "../daos/vehicle.dao";
import AdminDAO from "../daos/admin.dao";


export default class PatrolCarsController {

    static async create(req : Request, res : Response, next : NextFunction) {
        try {
            let result = await PatrolCarsDAO.create(req.body);
            res.send({success: true})
        }
        catch (err) {
            return next(err);
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            let data = await PatrolCarsDAO.getAll();

            res.send(data.map(item => ({...item, id: item.id.toString()})))
        } catch (err) {
            return next(err);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await PatrolCarsDAO.getById(parseInt(req.params.id));

            res.send(result[0]);
        } catch (e) {
            console.error(e)

            return next(e);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await PatrolCarsDAO.delete(parseInt(req.params.id));

            res.send({success:true});
        } catch (e) {
            console.error(e)

            return next(e);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        let id = parseInt(req.params.id);

        try {
            //Gets by ID
            let check = await PatrolCarsDAO.getById(id);

            //Check if result exists
            if (check.length === 0) {
                return next(new NotFoundError("Patrol Car not found.", "id"));
            }

            //Update by ID
            await PatrolCarsDAO.update(id, req.body);
            let result = await PatrolCarsDAO.getById(id)

            //Send the result
            res.send({success: true});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
