import {Router} from "express";
import PipelineController from "../../controllers/pipeline.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import StreamController from "../../controllers/stream.controller";

export default function routesStream(router : Router) {
    router.route('/streams')
        .get(StreamController.getAll)

    router.route('/streams/:node')
        .post(StreamController.create);

    router.route('/streams/:node/:id')
        .get(StreamController.getById)
        .put(StreamController.update)
        .delete(StreamController.delete);

    router.route('/stream/pipeline/:code')
        .get(authAll, PipelineController.getByAnalyticId)

    router.route('/stream/:node_num/:id/pipeline/:code')
        .post(PipelineController.createPipeline)
        .get(authAll, PipelineController.getPipeline)
        .put(authAdmin, PipelineController.updatePipeline)
        .delete(authAdmin, PipelineController.deletePipeline);
}
