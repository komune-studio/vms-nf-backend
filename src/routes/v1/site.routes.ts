import {Router} from "express";
import SiteController from "../../controllers/site.controller";
import {authAdmin, authAll, authSuperAdmin} from "../../middlewares/auth.middleware";
export default function routesSite(router : Router) {
    router.route('/sites')
        .get(authAll, SiteController.getAll)

    router.route('/site')
        .post(authSuperAdmin, SiteController.create)

    router.route('/site/:id')
        .get(authAdmin, SiteController.getById)
        .put(authSuperAdmin, SiteController.update)
        .delete(authSuperAdmin, SiteController.delete)

    router.route('/site/:id/assign-stream')
        .post(authAdmin, SiteController.assignStream)
}
