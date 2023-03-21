import { Router } from "express";
import UtilController from "../../controllers/util.controller";
import {authAll} from "../../middlewares/auth.middleware";

export default function routesAuth(router : Router) {
    router.route('/dashboard-summary')
        .get(authAll, UtilController.getDashboardSummary);

    router.route('/top-visitors')
        .get(authAll, UtilController.getTopVisitors);

    router.route('/api-config')
        .get(UtilController.getApiConfig);

    router.route('/resource_stats')
        .get(authAll, UtilController.getResourceStats);

    router.route('/node_status')
        .get(authAll, UtilController.getNodeStatus);
}
