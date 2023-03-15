import {Router} from "express";
import PipelineController from "../../controllers/pipeline.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";

export default function routesStream(router : Router) {
    router.route('/stream/pipeline/:code')
        .get(authAll, PipelineController.getByAnalyticId)

    router.route('/stream/:node_num/:id/pipeline/:code')
        .get(authAll, PipelineController.getPipeline)
        .put(authAdmin, PipelineController.updatePipeline);
}
