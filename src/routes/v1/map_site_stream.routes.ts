import {Router} from "express";
import MapSiteStreamController from "../../controllers/map_site_stream.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
export default function routesStream(router : Router) {
    router.route('/map_site_streams')
        .get(authAll, MapSiteStreamController.getByStreamId)
}
