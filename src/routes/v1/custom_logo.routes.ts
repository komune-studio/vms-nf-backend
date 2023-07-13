import {Router} from "express";
import CustomLogoController from "../../controllers/custom_logo.controller";
import {authAdmin, authAll, authSuperAdmin} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesCustomLogo(router : Router) {
    router.route('/custom-logo')
        .get(CustomLogoController.getAll)
        .post(authSuperAdmin, upload.single('images'), CustomLogoController.create)
}
