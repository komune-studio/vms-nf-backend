import {Router} from "express";
import FremisnController from "../../controllers/fremisn.controller";

export default function routesFremisn(router : Router) {
    router.route('/fremisn/face-search')
        .post(FremisnController.faceSearch)
}
