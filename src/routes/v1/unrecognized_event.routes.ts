import {Router} from "express";
import UnrecognizedEventController from "../../controllers/unrecognized_event.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";

export default function routesRecognizedEvent(router : Router) {
    router.route('/unrecognized_event')
        .post(UnrecognizedEventController.get)
}
