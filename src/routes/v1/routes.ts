import express from "express";
import routesAuth from "./auth.routes";
import routesBlacklist from "./blacklist.routes";
import routesEmployee from "./employee.routes";
import routesFace from "./face.routes";
import routesLocation from "./location.routes";
import routesUtil from "./util.routes";
import routesEvent from "./event.routes";
import routesStream from "./stream.routes";
import routesVehicle from "./vehicle.routes";
import routesSite from "./site.routes";
import routesMapSiteStream from "./map_site_stream.routes";

const router = express.Router();

routesAuth(router);
routesUtil(router);
routesEvent(router);
routesStream(router);
routesVehicle(router);
routesSite(router);
routesMapSiteStream(router);
routesFace(router);
routesBlacklist(router);
routesLocation(router);
routesEmployee(router);

export default router;
