import {Router} from "express";
import VisitationController from "../../controllers/visitation.controller";

export default function routesVisitation(router : Router) {
    router.route('/visitation')
        .post(VisitationController.createVisit);
}