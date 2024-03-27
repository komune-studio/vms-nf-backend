import {Router} from "express";
import NotificationUserController from "../../controllers/notification_user.controller";
import {authAdmin, authAll} from "../../middlewares/auth.middleware";
export default function notificationUserRoutes(router : Router) {
    router.route('/notification_user')
        .get(authAll, NotificationUserController.getById)

    router.route('/notification_user/:id/mark-read')
        .post(authAll, NotificationUserController.markRead)

    router.route('/notification_user/mark-all-as-read')
        .post(authAll, NotificationUserController.markAllAsRead)
}
