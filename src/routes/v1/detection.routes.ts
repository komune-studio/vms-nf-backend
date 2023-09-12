import { Router } from "express";
import DetectionController from "../../controllers/detection.controller";
import {authAdmin, authAll, authSuperAdmin, authUser} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesAuth(router : Router) {
    router.route('/detections')
        .post(authUser, DetectionController.create)
        .get(DetectionController.getAll)

    router.route('/detection/top-target')
        .get(DetectionController.getTopTarget)

    router.route('/detection/distribution')
        .get(DetectionController.getDetectionDistribution)

    router.route('/detection/top-3')
        .get(DetectionController.getTop3)

    router.route('/detection/:enrollment_id/associate')
        .get(DetectionController.getAssociates)
}
