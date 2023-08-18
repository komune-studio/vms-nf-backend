import {Router} from "express";
import PipelineController from "../../controllers/pipeline.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import StreamController from "../../controllers/stream.controller";
import CameraResolutionController from "../../controllers/camera_resolution.controller";

export default function routesCameraResolution(router : Router) {
    router.route('/cameraResolution/:streamId')
        .get(CameraResolutionController.getByStreamId)
}
