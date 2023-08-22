import {Router} from "express";
import PatrolCarsCoordinatesController from "../../controllers/patrol_cars_coordinates.controller";

export default function patrolCarsCoordinatesRoutes(router : Router) {
    router.route('/patrol_cars_coordinates')
        .post(PatrolCarsCoordinatesController.create)

    router.route('/patrol_cars_coordinates/:id')
        .put(PatrolCarsCoordinatesController.update)

    router.route('/patrol_cars_coordinates')
        .get(PatrolCarsCoordinatesController.getAll)
}
