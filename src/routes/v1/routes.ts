import express from "express";
import routesAuth from "./auth.routes";
import routesUtil from "./util.routes";
import routesEvent from "./event.routes";
import routesStream from "./stream.routes";

const router = express.Router();

routesAuth(router);
routesUtil(router);
routesEvent(router);
routesStream(router);

export default router;
