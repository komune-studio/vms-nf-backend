import cors from "cors";
import * as dotenv from "dotenv";
import express, {NextFunction, Request, Response} from "express";
import logger from "morgan";
import AuthController from "./controllers/auth.controller";

import handleErrors from "./middlewares/error.middleware";

import v1 from "./routes/v1/routes";
import PrismaService from "./services/prisma.service";
import {NotFoundError} from "./utils/error.utils";
import FremisnDAO from "./daos/fremisn.dao";
import RecognizedEventDAO from "./daos/recognized_event.dao";
import CameraResolutionDAO from "./daos/camera_resolution.dao";

import UnrecognizedEventDAO from "./daos/unrecognized_event.dao";
import WebsocketService from "./services/websocket.service";
import WebsocketUpdateService from "./services/websocket-update.service";
import CameraResolutionController from "./controllers/camera_resolution.controller";
import DashboardCustomizationDAO from "./daos/dashboard_customization.dao";
import EnrolledFaceDAO from "./daos/enrolled_face.dao";
import EventDAO from "./daos/event.dao";

dotenv.config();

const app = express();

const PORT = process.env.SERVER_PORT || 3000;

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true}));
app.use(logger("dev"));
app.use(cors());

app.get('/', (req: Request, res: Response) => {
    res.send({message: "Hello there!"});
});

app.use('/v1', v1)

app.use('*', (req: Request, res: Response, next : NextFunction) => {
    return next(new NotFoundError("Endpoint does not exist."))
})

app.use(handleErrors);

(async () => {
    await PrismaService.initialize();

    try {
        await AuthController.initialize();

        if(process.env.RECORD_FACE_DETECTION) {
            console.log('Creating keyspace: recognized')
            await FremisnDAO.createKeyspace('recognized');
            console.log('Keyspace created: recognized')

            console.log('Creating keyspace: unrecognized')
            await FremisnDAO.createKeyspace('unrecognized');
            console.log('Keyspace created: unrecognized')
        }

        console.log('Adding additional_info field in enrolled_face table')
        await EnrolledFaceDAO.addAdditionalInfoColumn()
        console.log("Additional info column has been added to Enrolled Face table.");

        console.log('Adding additional fields in event table')
        await EventDAO.addAdditionalColumn()
        console.log("Additional fields has been added to Event table.");

        console.log('Creating recognized_event table')
        await RecognizedEventDAO.createTable();
        console.log("recognized_event table created successfully.");

        console.log('Creating unrecognized_event table')
        await UnrecognizedEventDAO.createTable();
        console.log("unrecognized_event table created successfully.");

        console.log('Creating camera_resolution table')
        await CameraResolutionDAO.createTable();
        console.log("camera_resolution table created successfully.");

        console.log('Creating dashboard_customization table')
        await DashboardCustomizationDAO.createTable();
        console.log("dashboard_customization table created successfully.");

        const isAppNameInitialized = await DashboardCustomizationDAO.getByKey("app_name")

        if(!isAppNameInitialized) {
            await DashboardCustomizationDAO.insert({
                key: 'app_name',
                custom_text: 'Komune Surveillance'
            })

            console.log("app_name initialized.");
        }

    } catch (e) {
        console.log(e);
        return;
    }

    const server = app.listen(PORT, async () => {
        console.log(`Server listening on port ${PORT}!`);
    });

    // if(process.env.RECORD_FACE_DETECTION) {
        await WebsocketService.initialize(server, `ws://${process.env['NF_IP']}:${process.env['VANILLA_PORT']}/api/event_channel`);
        await WebsocketUpdateService.initialize(server, `ws://${process.env['NF_IP']}:${process.env['VISIONAIRE_PORT']}/event_channel`);
    // }
})();
