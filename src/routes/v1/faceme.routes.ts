import {Router} from "express";
import FaceMeController from "../../controllers/faceme.controller";
import {authAdmin} from "../../middlewares/auth.middleware";

export default function routesFaceImage(router : Router) {
    router.route('/face-me/token')
        .get(FaceMeController.getToken)
}
