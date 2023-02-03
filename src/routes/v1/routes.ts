import express from "express";
import routesAuth from "./auth.routes";
import routesEmployee from "./employee.routes";

const router = express.Router();

routesAuth(router);
routesEmployee(router);

export default router;