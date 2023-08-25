import express from "express";
import routesAuth from "./auth.routes";
import routesFace from "./face.routes";
import routesUtil from "./util.routes";
import routesEvent from "./event.routes";
import routesStream from "./stream.routes";
import routesVehicle from "./vehicle.routes";
import routesSite from "./site.routes";
import routesMapSiteStream from "./map_site_stream.routes";
import routesFremisn from "./fremisn.routes";
import routesCase from "./case.routes";
import routesUser from "./user.routes";
import routesDetection from "./detection.routes";
import routesVehicleDetection from "./vehicle_detection.routes";
import routesCustomLogo from "./custom_logo.routes";
import routesRecognizedEvent from "./recognized_event.routes";
import routesUnrecognizedEvent from "./unrecognized_event.routes";

const router = express.Router();

routesAuth(router);
routesUtil(router);
routesEvent(router);
routesStream(router);
routesVehicle(router);
routesSite(router);
routesMapSiteStream(router);
routesFace(router);
routesFremisn(router);
routesCase(router);
routesUser(router);
routesDetection(router);
routesVehicleDetection(router);
routesCustomLogo(router);
routesRecognizedEvent(router);
routesUnrecognizedEvent(router);

export default router;
