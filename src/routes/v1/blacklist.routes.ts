import {Router} from "express";
import BlacklistController from "../../controllers/blacklist.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesBlacklist(router : Router) {
    router.route('/blacklists')
        .get(authAll, BlacklistController.getAllBlacklisted)
        .post(authAdmin, upload.single('images'), BlacklistController.createBlacklisted);

    router.route('/blacklist/:id')
        .get(authAll, BlacklistController.getBlacklistedById)
        .put(authAdmin, upload.none(), BlacklistController.updateBlacklisted)
        .delete(authAdmin, BlacklistController.deleteBlacklisted);

    router.route('/blacklist/:id/unblacklist')
        .put(authAdmin, BlacklistController.unblacklist);
}