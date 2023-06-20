import {Router} from "express";
import WhitelistController from "../../controllers/whitelist.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesWhitelist(router : Router) {
    router.route('/whitelists')
        .get(authAll, WhitelistController.getAllWhitelisted)
        .post(authAdmin, upload.single('images'), WhitelistController.createWhitelisted);

    router.route('/whitelist/:id')
        .get(authAll, WhitelistController.getWhitelistedById)
        .put(authAdmin, upload.none(), WhitelistController.updateWhitelisted)
        .delete(authAdmin, WhitelistController.deletWhitelisted);
}
