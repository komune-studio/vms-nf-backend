import {Router} from "express";
import CaseController from "../../controllers/case.controller";
import {authAdmin, authAll, authSuperAdmin} from "../../middlewares/auth.middleware";

export default function routesCase(router : Router) {
    router.route('/cases')
        .get(authAll, CaseController.getAll)

    router.route('/case')
        .post(authSuperAdmin, CaseController.create)

    router.route('/case/:id')
        .get(CaseController.getById)
        .put(authSuperAdmin, CaseController.update)
        .delete(authSuperAdmin, CaseController.delete)
}
