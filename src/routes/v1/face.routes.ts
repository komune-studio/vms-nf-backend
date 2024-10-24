import {Router} from "express";
import FaceController from "../../controllers/face.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesFace(router : Router) {
    router.route('/faces')
        .get(FaceController.getFace)
        .post(upload.any(), FaceController.createFace);

    router.route('/face/dss/excluded-id')
        .get(FaceController.getFaceExcludeDssIds)

    router.route('/face/recognition')
        .post(FaceController.faceRecognition)

    router.route('/face/:id')
        .get(FaceController.getFaceById)
        .put(upload.any(), FaceController.updateFace)
        .delete(FaceController.deleteFace);


}
