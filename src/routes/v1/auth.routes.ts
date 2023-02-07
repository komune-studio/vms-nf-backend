import { Router } from "express";
import AuthController from "../../controllers/auth.controller";
import {authAdmin} from "../../middlewares/auth.middleware";

export default function routesAuth(router : Router) {
    router.route('/login')
        .post(AuthController.login);

    router.route('/generate-password')
        .post(authAdmin, AuthController.generatePassword)

    router.route('/admins')
        .get(authAdmin, AuthController.getAdmins)
        .post(authAdmin, AuthController.createAdmin)
}
