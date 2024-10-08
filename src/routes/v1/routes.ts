import express from "express";
import routesAuth from "./auth.routes";
import routesUtil from "./util.routes";
import routesEvent from "./event.routes";

const router = express.Router();

routesAuth(router);
routesUtil(router);
routesEvent(router);

export default router;
