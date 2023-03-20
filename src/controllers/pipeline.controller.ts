import {NextFunction, Request, Response} from "express";
import PipelineDAO from "../daos/pipeline.dao";
import request from "../utils/api.utils";

export default class PipelineController {

    static async createPipeline(req : Request, res : Response, next : NextFunction) {
        const { node_num, id, code } = req.params;

        try {
            let pipeline = await request(`${process.env.NF_VISIONAIRE_API_URL}/pipeline/${node_num}/${id}/${code}`, "POST", req.body);
            res.send({
                success: true,
                pipeline: pipeline
            })
        }
        catch (err) {
            return next(err);
        }
    }

    static async getByAnalyticId(req : Request, res : Response, next : NextFunction) {

        const { code } = req.params;

        try {
            let data = await PipelineDAO.getByAnalyticId(code);

            // @ts-ignore
            data = data.map(datum => datum.streams)

            res.send({
                success: true,
                streams: data
            })
        }
        catch (err) {
            return next(err);
        }
    }

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
            let deletePipeline = await request(`${process.env.NF_VISIONAIRE_API_URL}/pipeline/${node_num}/${id}/${code}`, "DELETE");
            let createPipeline = await request(`${process.env.NF_VISIONAIRE_API_URL}/pipeline/${node_num}/${id}/${code}`, "POST", req.body);
            res.send(createPipeline);
        }
        catch (err) {
            return next(err);
        }
    }

    static async deletePipeline(req : Request, res : Response, next : NextFunction) {
        const { node_num, id, code } = req.params;

        try {
            let pipeline = await request(`${process.env.NF_VISIONAIRE_API_URL}/pipeline/${node_num}/${id}/${code}`, "DELETE");
            res.send({
                success: true,
            })
        }
        catch (err) {
            return next(err);
        }
    }
}
