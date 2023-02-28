import {Express} from "express";
import PipelineController from "../../controllers/pipeline.controller";

export default function (app : Express) {
    app.route('/stream/:node_num/:id/pipeline/:code')
        .get(PipelineController.getPipeline)
        .put(PipelineController.updatePipeline);
}