import express from "express";
import routesAuth from "./auth.routes";
import routesEmployee from "./employee.routes";
import routesLogs from "./logs.routes";
import routesUtil from "./util.routes";
import routesEvent from "./event.routes";

const router = express.Router();

routesAuth(router);
routesEmployee(router);
routesLogs(router);
routesUtil(router);
routesEvent(router);

export default router;
