import {Router} from "express";
import DashboardCustomizationController from "../../controllers/dashboard_customization.controller";
import {authSuperAdmin} from "../../middlewares/auth.middleware";

export default function routesCameraResolution(router : Router) {
    router.route('/dashboard-customization')
        .get(DashboardCustomizationController.getAll)
        .post(authSuperAdmin, DashboardCustomizationController.update)
}
