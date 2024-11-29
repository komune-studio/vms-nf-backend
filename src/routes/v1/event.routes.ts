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

    router.route('/event/:stream_id/count-distinct/face')
        .get(EventController.getCountDistinctFaceId);

    router.route('/event/:stream_id/distinct/face')
        .get(EventController.getDistinctDetectedFace);

    router.route('/event/count-distinct/face')
        .get(EventController.getCountDistinctDetectedFace);

    router.route('/event/NFV4-FR/grouped')
        .get(EventController.getFREventGroupByStatusAndTime);

    router.route('/event/:stream_id/summary/face')
        .get(EventController.getFaceRecognitionSummary);
}
