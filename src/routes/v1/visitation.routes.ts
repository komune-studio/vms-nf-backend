import {Router} from "express";
import VisitationController from "../../controllers/visitation.controller";

export default function routesVisitation(router : Router) {
    router.route('/visitation')
        .post(VisitationController.createVisit)
        .get(VisitationController.getAllVisits);

    router.route('/visitation/:id')
        .get(VisitationController.getById)
        .put(VisitationController.updateVisit);
    
    router.route('/visitation/event/:id')
        .get(VisitationController.getByEventId);
}