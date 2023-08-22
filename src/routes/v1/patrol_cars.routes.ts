import {Router} from "express";
import PipelineController from "../../controllers/pipeline.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import StreamController from "../../controllers/stream.controller";
import PatrolCarsController from "../../controllers/patrol_cars.controller";
import CameraResolutionDAO from "../../daos/camera_resolution.dao";
import PatrolCarsDAO from "../../daos/patrol_cars.dao";

export default function patrolCarsRoutes(router : Router) {
    router.route('/patrol-cars')
        .post(PatrolCarsController.create)

    router.route('/patrol-cars/:id')
        .put(PatrolCarsController.update)

    router.route('/patrol-cars/:id')
        .get(PatrolCarsController.getById)

    router.route('/patrol-cars')
        .get(PatrolCarsController.getAll)
}
