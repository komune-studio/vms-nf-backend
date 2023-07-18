import {Router} from "express";
import SiteController from "../../controllers/site.controller";
import {authAdmin, authAll, authSuperAdmin} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";
export default function routesSite(router : Router) {
    router.route('/sites')
        .get(SiteController.getAll)

    router.route('/site')
        .post(authSuperAdmin, upload.single('images'), SiteController.create)

    router.route('/site/:id')
        .get(SiteController.getById)
        .put(authSuperAdmin, upload.single('images'), SiteController.update)
        .delete(authSuperAdmin, SiteController.delete)

    router.route('/site/:id/assign-stream')
        .post(authAdmin, SiteController.assignStream)
}
