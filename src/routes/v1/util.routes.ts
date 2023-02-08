import { Router } from "express";
import UtilController from "../../controllers/util.controller";
import {authAdmin} from "../../middlewares/auth.middleware";

export default function routesAuth(router : Router) {
    router.route('/dashboard-summary')
        .get(UtilController.getDashboardSummary);
}
