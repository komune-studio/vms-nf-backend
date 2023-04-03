import { Router } from "express";
import GlobalSettingController from "../../controllers/global_setting.controller";
import {authAdmin, authAll, authSuperAdmin} from "../../middlewares/auth.middleware";

export default function routesGlobalSetting(router : Router) {
    router.route('/similarity')
        .get(authAll, GlobalSettingController.get)
        .post(authAll, GlobalSettingController.update);
}
