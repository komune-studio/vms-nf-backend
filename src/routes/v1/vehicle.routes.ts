import {Router} from "express";
import VehicleController from "../../controllers/vehicle.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";

export default function routesVehicle(router : Router) {
    router.route('/vehicles')
        .post(authAdmin, VehicleController.createVehicle)
        .get(authAll, VehicleController.getAllVehicles);

    router.route('/vehicle/:id')
        .get(authAll, VehicleController.getVehicle)
        .put(authAdmin, VehicleController.updateVehicle)
        .delete(authAdmin, VehicleController.deleteVehicle);

}