import { Router } from "express";
import VehicleDetectionController from "../../controllers/vehicle_detection.controller";
import {authAdmin, authAll, authSuperAdmin, authUser} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";
import DetectionController from "../../controllers/detection.controller";

export default function routesVehicleDetection(router : Router) {
    router.route('/vehicle-detections')
        .post(authUser, VehicleDetectionController.create)
        .get(VehicleDetectionController.getAll)

    router.route('/vehicle-detection/distribution')
        .get(VehicleDetectionController.getDetectionDistribution)

    router.route('/vehicle-detection/top-3')
        .get(VehicleDetectionController.getTop3)
}