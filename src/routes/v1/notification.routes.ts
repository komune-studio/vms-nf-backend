import {Router} from "express";
import NotificationController from "../../controllers/notification.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
export default function notificationRoutes(router : Router) {
    router.route('/notifications')
        .get(NotificationController.getAll)
}
