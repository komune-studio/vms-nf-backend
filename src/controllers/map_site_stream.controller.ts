import {NextFunction, Request, Response} from "express";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";

export default class MapSiteStreamController {
    static async getByStreamId(req: Request, res: Response, next: NextFunction) {
        try {
            // @ts-ignore
            let data = await MapSiteStreamDAO.getByStreamId(req.query.stream_id);

            // @ts-ignore
            res.send({site_id: data ? parseInt(data.site_id) : data})
        } catch (err) {
            return next(err);
        }
    }


}
