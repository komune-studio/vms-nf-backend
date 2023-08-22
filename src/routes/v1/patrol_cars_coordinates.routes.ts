import {Router} from "express";
import PatrolCarsCoordinatesController from "../../controllers/patrol_cars_coordinates.controller";

export default function patrolCarsCoordinatesRoutes(router : Router) {
    router.route('/patrolCarsCoordinates')
        .post(PatrolCarsCoordinatesController.create)

    router.route('/patrolCarsCoordinates/:id')
        .put(PatrolCarsCoordinatesController.update)

    router.route('/patrolCarsCoordinates')
        .get(PatrolCarsCoordinatesController.getAll)
}
