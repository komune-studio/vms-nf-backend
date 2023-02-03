import { Router } from "express";
import AuthController from "../../controllers/auth.controller";

export default function routesAuth(router : Router) {
    router.route('/login')
        .get(AuthController.login);
}
