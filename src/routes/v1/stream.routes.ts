import {Router} from "express";
import PipelineController from "../../controllers/pipeline.controller";

export default function routesStream(router : Router) {
    router.route('/stream/pipeline/:code')
        .get(PipelineController.getByAnalyticId)

    router.route('/stream/:node_num/:id/pipeline/:code')
        .get(PipelineController.getPipeline)
        .put(PipelineController.updatePipeline);
}
