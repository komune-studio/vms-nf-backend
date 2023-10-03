import {Router} from "express";
import SystemController from "../../controllers/system.controller";
import {authAll} from "../../middlewares/auth.middleware";

export default function systemRoutes(router : Router) {
    router.route('/system')
        .get(SystemController.getAll);
}
