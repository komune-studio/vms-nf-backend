import express from "express";
import routesAuth from "./auth.routes";
import routesEmployee from "./employee.routes";
import routesLogs from "./logs.routes";

const router = express.Router();

routesAuth(router);
routesEmployee(router);
routesLogs(router);

export default router;
