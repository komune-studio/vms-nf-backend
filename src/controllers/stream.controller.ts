import {NextFunction, Request, Response} from "express";
import StreamDAO from "../daos/stream.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import PipelineDAO from "../daos/pipeline.dao";

export default class StreamController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const streams = await StreamDAO.getAll();

            const mapSiteStream = await MapSiteStreamDAO.getByStreamIds(streams.map(stream => stream.id))
            const analytics = await PipelineDAO.getByStreamIds(streams.map(stream => stream.id))

            streams.forEach((stream, idx) => {
                // @ts-ignore
                streams[idx].pipelines = [];

                mapSiteStream.forEach(siteStream => {
                    if(stream.id === siteStream.stream_id) {
                        // @ts-ignore
                        streams[idx].site_id = parseInt(siteStream.site_id);
                    }
                })

                analytics.forEach(analytic => {
                    if(stream.id === analytic.stream_id) {
                        // @ts-ignore
                        streams[idx].pipelines.push(analytic.analytic_id);
                    }
                })
            })

            // @ts-ignore
            res.send(streams)
        } catch (err) {
            return next(err);
        }
    }


}
