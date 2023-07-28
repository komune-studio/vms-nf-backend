import {Router} from "express";
import RecognizedEventController from "../../controllers/recognized_event.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";

export default function routesRecognizedEvent(router : Router) {
    router.route('/recognized_event')
        .post(RecognizedEventController.get)
}
