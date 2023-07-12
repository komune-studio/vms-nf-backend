import { Router } from "express";
import DetectionController from "../../controllers/detection.controller";
import {authAdmin, authAll, authSuperAdmin, authUser} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesAuth(router : Router) {
    router.route('/detections')
        .post(authUser, DetectionController.create)
        .get(DetectionController.getAll)

    router.route('/detection/:enrollment_id/associate')
        .get(DetectionController.getTopAssociate)
}
