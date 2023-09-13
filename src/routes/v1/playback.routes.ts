import {Router} from "express";
import PipelineController from "../../controllers/pipeline.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import PlaybackController from "../../controllers/playback.controller";

export default function routesPlayback(router : Router) {
    router.route('/playback/rtsp-url')
        .post(PlaybackController.getRTSPUrls)
}
