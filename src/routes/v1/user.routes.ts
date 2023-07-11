import { Router } from "express";
import UserController from "../../controllers/user.controller";
import {authAdmin, authAll, authSuperAdmin, authUser} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesAuth(router : Router) {
    router.route('/login/user')
        .post(UserController.login);

    router.route('/authenticate/user')
        .post(authUser, UserController.authenticate);

    router.route('/users')
        .get(authSuperAdmin, UserController.getAll)
        .post(authSuperAdmin, upload.single('images'), UserController.create)

    router.route('/user/:id')
        .get(authSuperAdmin, UserController.getById)
        .put(authSuperAdmin, upload.single('images'), UserController.update)
        .delete(authSuperAdmin, UserController.delete)
}
