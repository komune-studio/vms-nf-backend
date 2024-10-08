import {Router} from "express";
import EventController from "../../controllers/event.controller";
import {authAll} from "../../middlewares/auth.middleware";

export default function eventRoutes(router : Router) {
    router.route('/event')
        .get(EventController.getAll);

    router.route('/event/:event_id')
        .get(EventController.getByEventId);

    router.route('/event/:face_id/track')
        .get(authAll, EventController.getByFaceId);
}
