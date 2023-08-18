import {ca} from "date-fns/locale";
import {NextFunction, Request, Response} from "express";
import CameraResolutionDAO from "../daos/camera_resolution.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import PipelineDAO from "../daos/pipeline.dao";
import request from "../utils/api.utils";
import {NotFoundError} from "../utils/error.utils";
import PrismaService from "../services/prisma.service";
import SecurityUtils from "../utils/security.utils";
import VehicleDAO from "../daos/vehicle.dao";
import AdminDAO from "../daos/admin.dao";


export default class CameraResolutionController {

    static async getByStreamId(req: Request, res: Response, next: NextFunction) {
        const {streamId} = req.params;

        try {
            let resolution : any = (await CameraResolutionDAO.getByStreamID(streamId));
            console.log("resolution", resolution)
            if (!resolution) {
                return next(new NotFoundError("Resolution not found.", "RESOLUTION"));
            }

            res.send(resolution);
        } catch (e) {
            console.log("resolution error",e)
            return next(e);
        }
    }

    static async create(req : Request, res : Response, next : NextFunction) {
        try {
            let result = await CameraResolutionDAO.create(req.body);
            res.send(result)
        }
        catch (err) {
            return next(err);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        let id = parseInt(req.params.id);

        try {
            let resolution = await CameraResolutionDAO.getById(id);

            if (resolution.length === 0) {
                return next(new NotFoundError("Resolution not found.", "id"));
            }

            await CameraResolutionDAO.update(id, req.body);
            let result = await CameraResolutionDAO.getById(id)

            res.send(result);
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
