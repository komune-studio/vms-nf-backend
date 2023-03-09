import {Router} from "express";
import VehicleController from "../../controllers/vehicle.controller";
import {authAdmin} from "../../middlewares/auth.middleware";

export default function routesVehicle(router : Router) {
    router.route('/vehicles')
        .post(authAdmin, VehicleController.createVehicle)
        .get(authAdmin, VehicleController.getAllVehicles);

    router.route('/vehicle/:id')
        .get(authAdmin, VehicleController.getVehicle)
        .put(authAdmin, VehicleController.updateVehicle)
        .delete(authAdmin, VehicleController.deleteVehicle);

}