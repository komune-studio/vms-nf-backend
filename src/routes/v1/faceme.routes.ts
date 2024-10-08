import {Router} from "express";
import FaceMeController from "../../controllers/faceme.controller";
import {authAdmin} from "../../middlewares/auth.middleware";

export default function routesFaceImage(router : Router) {
    router.route('/face-me/api')
        .post(FaceMeController.hitAPI)

    router.route('/face-me/person')
        .post(FaceMeController.addPerson)
}