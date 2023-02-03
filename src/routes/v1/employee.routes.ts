import { Router } from "express";

import EmployeeController from "../../controllers/employee.controller";
import upload from "../../utils/multer.utils";

export default function routesEmployee(router : Router) {
    router.route('/employees')
        .post(upload.fields([{name: "ktp_image"}, {name: "face_image"}]), EmployeeController.create)
}