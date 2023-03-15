import { Router } from "express";
import AuthController from "../../controllers/auth.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";

export default function routesAuth(router : Router) {
    router.route('/login')
        .post(AuthController.login);

    router.route('/authenticate')
        .post(authAll, AuthController.authenticate);

    router.route('/generate-password')
        .post(AuthController.generatePassword)

    router.route('/admins')
        .get(authAdmin, AuthController.getAdmins)
        .post(authAdmin, AuthController.createAdmin)

    router.route('/admin/:id')
        .get(authAdmin, AuthController.getById)
        .put(authAdmin, AuthController.update)
        .delete(authAdmin, AuthController.deleteAdmin)

    router.route('/admin/:id/change-password')
        .post(authAdmin, AuthController.changePassword)
}
