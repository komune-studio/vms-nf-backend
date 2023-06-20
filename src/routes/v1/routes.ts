import express from "express";
import routesAuth from "./auth.routes";
import routesBlacklist from "./blacklist.routes";
import routesWhitelist from "./whitelist.routes";
import routesEmployee from "./employee.routes";
import routesFace from "./face.routes";
import routesLocation from "./location.routes";
import routesUtil from "./util.routes";
import routesEvent from "./event.routes";
import routesStream from "./stream.routes";
import routesVehicle from "./vehicle.routes";
import routesSite from "./site.routes";
import routesMapSiteStream from "./map_site_stream.routes";
import routesVisitation from "./visitation.routes";
import routesGlobalSetting from "./global_setting.routes";
import routesCustomizedForm from "./customized_form.routes";

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
routesWhitelist(router);
routesLocation(router);
routesEmployee(router);
routesVisitation(router);
routesGlobalSetting(router)
routesCustomizedForm(router)

export default router;
