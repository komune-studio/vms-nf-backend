import { Router } from "express";
import LogsController from "../../controllers/logs.controller";

export default function routesLogs(router : Router) {
    router.route('/logs')
        .post(LogsController.create);
}
