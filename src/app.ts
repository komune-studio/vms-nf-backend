import cors from "cors";
import * as dotenv from "dotenv";
import express, {NextFunction, Request, Response} from "express";
import logger from "morgan";
import AuthController from "./controllers/auth.controller";

import handleErrors from "./middlewares/error.middleware";

import v1 from "./routes/v1/routes";
import PrismaService from "./services/prisma.service";
import {NotFoundError} from "./utils/error.utils";
import WebsocketService from "./services/websocket.service";
import CameraResolutionController from "./controllers/camera_resolution.controller";
import PatrolCarsDAO from "./daos/system.dao";
import PatrolCarsCoordinatesDAO from "./daos/patrol_cars_coordinates.dao";
import EventMasterDataDAO from "./daos/event_master_data.dao";
import StreamMasterDataDAO from "./daos/stream_master_data.dao";
import PipelineMasterDataDAO from "./daos/pipeline_master_data.dao";
import request from "./utils/api.utils";
import SystemDAO from "./daos/system.dao";

dotenv.config();

const app = express();
const ip: any[] = [];

const PORT = process.env.SERVER_PORT || 3000;

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true}));
app.use(logger("dev"));
app.use(cors());

app.get('/', (req: Request, res: Response) => {
    res.send({message: "Hello there!"});
});

app.use('/v1', v1)

app.use('*', (req: Request, res: Response, next: NextFunction) => {
    return next(new NotFoundError("Endpoint does not exist."))
})

app.use(handleErrors);

const startAggregator = async () => {
    try {
        const response = await SystemDAO.getAll()

        for (const data of response) {
            if (!ip.includes(data.ip)) {
                await WebsocketService.initialize(`ws://${data.ip}:3031`, data.id);
                ip.push(data.ip)
            } else {
                console.log(`Ignore id ${data.id}!`)
            }
        }
    } catch (e) {
        console.log(e)
    }
}

(async () => {
    startAggregator()

    await PrismaService.initialize();

    try {
        console.log('Creating system table')
        await SystemDAO.createTable();
        console.log("system table created successfully.");

        console.log('Creating event_master_data table')
        await EventMasterDataDAO.createTable();
        console.log("event_master_data table created successfully.");
    } catch (e) {
        console.log(e);
        return;
    }

    app.listen(PORT, async () => {
        console.log(`Server listening on port ${PORT}!`);
    });
})();
