import {Router} from "express";
import EventMasterDataController from "../../controllers/event_master_data.controller";
import {authAll} from "../../middlewares/auth.middleware";

export default function eventMaterDataRoutes(router : Router) {
    router.route('/event_master_data')
        .get(EventMasterDataController.getAll);
}
