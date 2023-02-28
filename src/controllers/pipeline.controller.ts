import {NextFunction, Request, Response} from "express";
import PipelineDAO from "../daos/pipeline.dao";
import request from "../utils/api.utils";

export default class PipelineController {

    static async getPipeline(req : Request, res : Response, next : NextFunction) {

        const { id, code } = req.params;

        try {
            let pipeline = await PipelineDAO.getPipeline(id, code);
            res.send({
                success: true,
                pipeline: pipeline
            })
        }
        catch (err) {
            return next(err);
        }
    }

    static async updatePipeline(req : Request, res : Response, next : NextFunction) {
        const { node_num, id, code } = req.params;

        try {
            let deletePipeline = await request(`http://localhost:4004/pipeline/${node_num}/${id}/${code}`, "DELETE");
            let createPipeline = await request(`http://localhost:4004/pipeline/${node_num}/${id}/${code}`, "POST", req.body);
            res.send(createPipeline);
        }
        catch (err) {
            return next(err);
        }
    }
}