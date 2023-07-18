import {Router} from "express";
import VisitationController from "../../controllers/visitation.controller";
import {authAll, authSuperAdmin} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesVisitation(router : Router) {
    router.route('/visitation')
        .post(authAll, upload.single('images'), VisitationController.createVisit)
        .get(authAll, VisitationController.getAllVisits);

    router.route('/visitation/check-in')
        .post(upload.single('images'), VisitationController.selfCheckIn)

    router.route('/visitation/member')
        .get(VisitationController.getMember);

    router.route('/visitation/:id')
        .get(VisitationController.getById)
        .put(VisitationController.updateVisit);

    router.route('/visitation/:id/visitor')
        .get(VisitationController.getByEnrolledFaceId)

    router.route('/visitation/:id/approve')
        .post(VisitationController.approve)

    router.route('/visitation/:id/check-out')
        .post(authAll, VisitationController.checkOut)

    router.route('/visitation/:id/check-out/self')
        .post(VisitationController.selfCheckOut)

    router.route('/visitation/event/:id')
        .get(VisitationController.getByEventId);
}
