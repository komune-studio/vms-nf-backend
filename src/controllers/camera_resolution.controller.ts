import {ca} from "date-fns/locale";
import {NextFunction, Request, Response} from "express";
import CameraResolutionDAO from "../daos/camera_resolution.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import PipelineDAO from "../daos/pipeline.dao";
import request from "../utils/api.utils";
import {NotFoundError} from "../utils/error.utils";

export default class CameraResolutionController {

    static async getByStreamId(req: Request, res: Response, next: NextFunction) {
        const {streamId} = req.params;

        try {
            let resolution : any = (await CameraResolutionDAO.getByStreamID(streamId));
            console.log("resolution", resolution)
            if (!resolution) {
                return next(new NotFoundError("Resolution not found.", "RESOLUTION"));
            }

            res.send("streamId");
        } catch (e) {
            return next(e);
        }
    }

}
