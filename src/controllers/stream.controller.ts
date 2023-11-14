import {ca} from "date-fns/locale";
import {NextFunction, Request, Response} from "express";
import StreamDAO from "../daos/stream.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import PipelineDAO from "../daos/pipeline.dao";
import request from "../utils/api.utils";
import {NotFoundError} from "../utils/error.utils";

export default class StreamController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const streams = await StreamDAO.getAll();

            const mapSiteStream = await MapSiteStreamDAO.getByStreamIds(streams.map(stream => stream.id))
            const analytics = await PipelineDAO.getByStreamIds(streams.map(stream => stream.id))


            // for(const stream of data) {
            //     // @ts-ignore
            //     let result = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${stream.node_num}/${stream.id}`, "GET")
            //
            //     // @ts-ignore
            //     stream.stream_stats = result.stream_stats;
            // }

            for(const stream of streams) {
                // @ts-ignore
                let result = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${stream.node_num}/${stream.id}`, "GET")

                // @ts-ignore
                stream.stream_stats = result.stream_stats;

                // @ts-ignore
                stream.pipelines = [];

                mapSiteStream.forEach(siteStream => {
                    if(stream.id === siteStream.stream_id) {
                        // @ts-ignore
                        stream.site_id = parseInt(siteStream.site_id);
                    }
                })

                analytics.forEach(analytic => {
                    if(stream.id === analytic.stream_id) {
                        // @ts-ignore
                        stream.pipelines.push(analytic.analytic_id);
                    }
                })
            }

            // @ts-ignore
            res.send(streams)
        } catch (err) {
            console.log(err)
            return next(err);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        const {node} = req.params;

        try {
            let result = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${node}`, "POST", req.body)
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        const {node, id} = req.params;

        try {
            let stream : any = (await StreamDAO.getStreamsById([id]))[0];
            if (!stream) {
                return next(new NotFoundError("Stream not found.", "STREAM"));
            }

            let result = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${node}/${id}`, "GET")

            let pipelines = await PipelineDAO.getByStreamIds([id]);
            stream.pipelines = pipelines.map(pipeline => pipeline.analytic_id);
            stream.stats = result.stream_stats;

            res.send(stream);
        } catch (e) {
            return next(e);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        const {node, id} = req.params;
        try {
            let result = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${node}/${id}`, "PUT", req.body)
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }
    static async delete(req: Request, res: Response, next: NextFunction) {
        const {node, id} = req.params;
        try {
            let result = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${node}/${id}`, "DELETE", req.body)
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

}
