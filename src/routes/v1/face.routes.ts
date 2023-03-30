import {Router} from "express";
import FaceController from "../../controllers/face.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesFace(router : Router) {
    router.route('/faces')
        .get(authAll, FaceController.getFace)
        .post(authAdmin,  upload.single('images'), FaceController.createFace);

    router.route('/face/:id')
        .get(authAll, FaceController.getFaceById)
        .put(authAdmin,  upload.single('images'), FaceController.updateFace)
        .delete(authAdmin, FaceController.deleteFace);
}
