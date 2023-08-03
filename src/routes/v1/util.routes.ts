import { Router } from "express";
import UtilController from "../../controllers/util.controller";
import {authAll} from "../../middlewares/auth.middleware";
import multer from "multer"

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, '/tmp')
    },
    filename: function (req, file, cb) {
        const extension = file.originalname.split(".").pop() === 'blob' ? 'mp4' : file.originalname.split(".").pop();
        cb(null, new Date().getTime() + "." + extension)
    }
})

const upload = multer({storage: storage})

export default function routesAuth(router : Router) {
    router.route('/dashboard-summary')
        .get(authAll, UtilController.getDashboardSummary);

    router.route('/top-visitors')
        .get(authAll, UtilController.getTopVisitors);

    router.route('/api-config')
        .get(UtilController.getApiConfig);

    router.route('/resource_stats')
        .get(authAll, UtilController.getResourceStats);

    router.route('/node_status')
        .get(authAll, UtilController.getNodeStatus);

    router.route('/upload_video')
        .post(authAll, upload.single('video'), UtilController.uploadVideo);
}
