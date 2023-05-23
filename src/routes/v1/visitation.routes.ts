import {Router} from "express";
import VisitationController from "../../controllers/visitation.controller";
import {authSuperAdmin} from "../../middlewares/auth.middleware";

export default function routesVisitation(router : Router) {
    router.route('/visitation')
        .post(VisitationController.createVisit)
        .get(VisitationController.getAllVisits);

    router.route('/visitation/:id')
        .get(VisitationController.getById)
        .put(VisitationController.updateVisit);

    router.route('/visitation/:id/approve')
        .post(authSuperAdmin, VisitationController.approve)

    router.route('/visitation/event/:id')
        .get(VisitationController.getByEventId);
}
