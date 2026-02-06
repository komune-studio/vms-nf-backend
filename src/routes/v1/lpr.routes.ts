import {Router} from "express";
import LprController from "../../controllers/lpr.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesLpr(router : Router) {
    router.route('/license-plate-recognition')
        .post(LprController.licensePlateRecognition)
}
