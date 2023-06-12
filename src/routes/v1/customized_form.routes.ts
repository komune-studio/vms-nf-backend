import {Router} from "express";
import CustomizedFormController from "../../controllers/customized_form.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";

export default function routeCustomizedForm(router : Router) {
    router.route('/customized-forms')
        .get(CustomizedFormController.getAll)
        .post(authAdmin, CustomizedFormController.create);

    router.route('/customized-forms/:id')
        .get(authAll, CustomizedFormController.getOne)
        .put(authAdmin, CustomizedFormController.update)
    ;
}
