import { Router } from "express";
import EventController from "../../controllers/event.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";

export default function eventRoutes(router : Router) {
    router.route('/event')
        .get(authAll, EventController.getAll);

    router.route('/event/:face_id/track')
        .get(authAll, EventController.getByFaceId);
}
