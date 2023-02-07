import { Router } from "express";

import EmployeeController from "../../controllers/employee.controller";
import upload from "../../utils/multer.utils";
import {authAdmin} from "../../middlewares/auth.middleware";

export default function routesEmployee(router : Router) {
    router.route('/employees')
        .get(authAdmin, EmployeeController.getAll)
        .post(authAdmin, upload.fields([{name: "ktp_image"}, {name: "face_image"}]), EmployeeController.create)

    router.route('/employee/:id')
        .get(authAdmin, EmployeeController.getById)
        .put(authAdmin, EmployeeController.update)
        .delete(authAdmin, EmployeeController.delete)
}