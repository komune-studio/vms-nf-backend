import {Router} from "express";
import FaceController from "../../controllers/face.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesFace(router : Router) {
    router.route('/faces')
        .get(authAll, FaceController.getFace)
        .post(upload.single('images'), FaceController.createFace);

    router.route('/face/reenroll')
        .post(authAdmin, FaceController.reenroll)

    router.route('/face/match')
        .post(FaceController.faceMatch)

    router.route('/face/:id')
        .get(authAll, FaceController.getFaceById)
        .put(authAdmin, upload.single('images'), FaceController.updateFace)
        .delete(authAdmin, FaceController.deleteFace);

    router.route('/face/:id/blacklist')
        .put(authAdmin, FaceController.blacklistFace);

    router.route('/face/:identity_number/identity_number')
        .get(FaceController.getByIdentityNumber)
}
