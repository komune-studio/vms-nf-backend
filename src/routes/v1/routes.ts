import express from "express";
import routesAuth from "./auth.routes";
import routesFace from "./face.routes";
import routesUtil from "./util.routes";
import routesEvent from "./event.routes";
import routesStream from "./stream.routes";
import routesVehicle from "./vehicle.routes";
import routesSite from "./site.routes";
import routesMapSiteStream from "./map_site_stream.routes";
import routesRecognizedEvent from "./recognized_event.routes";
import routesUnrecognizedEvent from "./unrecognized_event.routes";
import routesCameraResolution from "./camera_resolution.routes";
import routesDashboardCustomization from "./dashboard_customization.routes";
import routesCustomStatus from "./custom_status.routes";

const router = express.Router();

routesAuth(router);
routesUtil(router);
routesEvent(router);
routesStream(router);
routesVehicle(router);
routesSite(router);
routesMapSiteStream(router);
routesFace(router);
routesRecognizedEvent(router);
routesUnrecognizedEvent(router);
routesCameraResolution(router);
routesDashboardCustomization(router);
routesCustomStatus(router);


export default router;
