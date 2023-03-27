import {Router} from "express";
import LocationController from "../../controllers/location.controller";

export default function routesLocation(router : Router) {
    router.route('/locations')
        .get(LocationController.getAll)
        .post(LocationController.create);

    router.route('/location/:id')
        .get(LocationController.getOne)
        .put(LocationController.update);
        // .delete(LocationController.delete);
}