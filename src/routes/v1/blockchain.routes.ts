import {Router} from "express";
import BlockhainController from "../../controllers/blockhain.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesBlockchain(router : Router) {
    router.route('/blockhain/logs')
        .get(BlockhainController.get)
        .post(BlockhainController.create)
}
