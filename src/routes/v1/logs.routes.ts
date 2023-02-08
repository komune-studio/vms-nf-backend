import { Router } from "express";
import LogsController from "../../controllers/logs.controller";
import {authAdmin} from "../../middlewares/auth.middleware";

export default function routesLogs(router : Router) {
    router.route('/logs')
        .post(LogsController.create)
        .get(authAdmin, LogsController.getAll);
}
