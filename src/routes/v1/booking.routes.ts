import {Router} from "express";
import BookingController from "../../controllers/booking.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
import upload from "../../utils/multer.utils";

export default function routesBlacklist(router : Router) {
    router.route('/booking')
        .get(authAll, BookingController.getAll)
        .post(upload.single('images'), BookingController.create);

    router.route('/booking/face')
        .post(BookingController.getBookingByFace)

    router.route('/booking/:id')
        .get(BookingController.getById)

    router.route('/booking/:id/inactivate')
        .post(BookingController.inactivate)
}
