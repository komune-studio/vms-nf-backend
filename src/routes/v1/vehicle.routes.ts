import {Router} from "express";
import VehicleController from "../../controllers/vehicle.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";

export default function routesVehicle(router : Router) {
    router.route('/vehicles')
        .post(authAdmin, VehicleController.createVehicle)
        .get(authAll, VehicleController.getAllVehicles);

    router.route('/vehicle/case-distribution')
        .get(VehicleController.getCaseDistribution)

    router.route('/vehicle/:id')
        .get(authAll, VehicleController.getVehicle)
        .put(authAdmin, VehicleController.updateVehicle)
        .delete(authAdmin, VehicleController.deleteVehicle);

    router.route('/vehicle/:plate/plate')
        .get(VehicleController.getByPlate)

    router.route('/vehicle/:id/user_id')
        .put(VehicleController.updateUserId)
}
