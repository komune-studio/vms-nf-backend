import { Router } from "express";
import AuthController from "../../controllers/auth.controller";
import {authAdmin, authAll, authSuperAdmin} from "../../middlewares/auth.middleware";

export default function routesAuth(router : Router) {
    router.route('/login')
        .post(AuthController.login);

    router.route('/authenticate')
        .post(authAll, AuthController.authenticate);

    router.route('/generate-password')
        .post(AuthController.generatePassword)

    router.route('/admins')
        .get(authSuperAdmin, AuthController.getAdmins)
        .post(authSuperAdmin, AuthController.createAdmin)

    router.route('/admin/:id')
        .get(authSuperAdmin, AuthController.getById)
        .put(authSuperAdmin, AuthController.update)
        .delete(authSuperAdmin, AuthController.deleteAdmin)

    router.route('/admin/:id/change-password')
        .post(authSuperAdmin, AuthController.changePassword)
}
