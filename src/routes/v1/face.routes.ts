import {Router} from "express";
import FaceController from "../../controllers/face.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";

export default function routesFace(router : Router) {
    router.route('/faces')
        .get(authAll, FaceController.getFace)
        .post(authAdmin, FaceController.createFace);

    router.route('/face/:id')
        .get(authAll, FaceController.getFaceById)
        .put(authAdmin, FaceController.updateFace)
        .delete(authAdmin, FaceController.deleteFace);
}