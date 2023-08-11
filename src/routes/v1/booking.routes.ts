import {Router} from "express";
import BookingController from "../../controllers/booking.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesBlacklist(router : Router) {
    router.route('/booking')
        .get(authAll, BookingController.getAll)
        .post(upload.single('images'), BookingController.create);

    router.route('/booking/:id')
        .get(authAll, BookingController.getById)
        .delete(BookingController.delete)

    router.route('/booking/:id/inactivate')
        .post(BookingController.inactivate)
}
