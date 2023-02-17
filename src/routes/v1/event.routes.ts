import { Router } from "express";
import EventController from "../../controllers/event.controller";
import {authAdmin} from "../../middlewares/auth.middleware";

export default function eventRoutes(router : Router) {
    router.route('/event')
        .get(EventController.getAll);
}
