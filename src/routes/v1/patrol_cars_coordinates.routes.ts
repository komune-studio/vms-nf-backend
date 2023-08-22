import {Router} from "express";
import PatrolCarsCoordinatesController from "../../controllers/patrol_cars_coordinates.controller";

export default function patrolCarsCoordinatesRoutes(router : Router) {
    router.route('/patrol-cars-coordinates')
        .post(PatrolCarsCoordinatesController.create)

    router.route('/patrol-cars-coordinates/:id')
        .put(PatrolCarsCoordinatesController.update)

    router.route('/patrol-cars-coordinates')
        .get(PatrolCarsCoordinatesController.getAll)
}
