import {Router} from "express";
import EmployeeController from "../../controllers/employee.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";

export default function routesEmployee(router : Router) {
    router.route('/employees')
        .get(authAll, EmployeeController.getAll)
        .post(authAdmin, EmployeeController.create);

    router.route('/employee/:id')
        .get(authAll, EmployeeController.getOne)
        .put(authAdmin, EmployeeController.update)
        .delete(EmployeeController.delete);
}
