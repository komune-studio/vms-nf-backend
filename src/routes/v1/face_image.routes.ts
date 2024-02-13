import {Router} from "express";
import FaceImageController from "../../controllers/face_image.controller";
import {authAdmin} from "../../middlewares/auth.middleware";

export default function routesFaceImage(router : Router) {
    router.route('/face-image/:id/full-size')
        .get(authAdmin, FaceImageController.getFullSizeFaceImage)
}
