import {Router} from "express";
import SiteController from "../../controllers/site.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
export default function routesStream(router : Router) {
    router.route('/sites')
        .get(authAll, SiteController.getAll)

    router.route('/site')
        .post(authAdmin, SiteController.create)

    router.route('/site/:id')
        .get(authAdmin, SiteController.getById)
        .put(authAdmin, SiteController.update)
        .delete(authAdmin, SiteController.delete)

    router.route('/site/:id/assign-stream')
        .post(authAdmin, SiteController.assignStream)
}
