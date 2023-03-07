import {Express, Router} from "express";
import PipelineController from "../../controllers/pipeline.controller";

export default function (router : Router) {
    router.route('/stream/:node_num/:id/pipeline/:code')
        .get(PipelineController.getPipeline)
        .put(PipelineController.updatePipeline);
}
