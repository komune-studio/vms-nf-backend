import {Router} from "express";
import {authSuperAdmin} from "../../middlewares/auth.middleware";
import CustomStatusController from "../../controllers/custom_status.controller";

export default function routesCustomStatus(router : Router) {
    router.route('/custom-status')
        .get(authSuperAdmin, CustomStatusController.getAll)
        .post(authSuperAdmin, CustomStatusController.create)

    router.route('/custom-status/:id')
        .get(authSuperAdmin, CustomStatusController.getById)
        .put(authSuperAdmin, CustomStatusController.update)
}
