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
import CameraResolutionController from "./controllers/camera_resolution.controller";
import PatrolCarsDAO from "./daos/patrol_cars.dao";
import PatrolCarsCoordinatesDAO from "./daos/patrol_cars_coordinates.dao";
import EventMasterDataDAO from "./daos/event_master_data.dao";
import StreamMasterDataDAO from "./daos/stream_master_data.dao";
import PipelineMasterDataDAO from "./daos/pipeline_master_data.dao";
import request from "./utils/api.utils";

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
        const response = await PatrolCarsDAO.getAll()
        await StreamMasterDataDAO.deleteAll();
        await PipelineMasterDataDAO.deleteAll();


        for (const data of response) {
            const streams = await request(`http://${data.ip}:4004/streams`, 'GET');

            for (const stream of streams.streams) {
                await StreamMasterDataDAO.create({
                    stream_id: stream.stream_id,
                    address: stream.stream_address,
                    name: stream.stream_name,
                    node_num: stream.stream_node_num,
                    latitude: stream.stream_latitude,
                    longitude: stream.stream_longitude,
                    patrol_car_id: data.id
                })
                // console.log(stream)

                const pipelines = await request(`http://${data.ip}:4004/streams/${stream.stream_node_num}/${stream.stream_id}`, 'GET');

                for (const pipeline of pipelines.pipelines) {
                    console.log(pipeline)

                    await PipelineMasterDataDAO.create({
                        stream_id: stream.stream_id,
                        analytic_id: pipeline,
                        patrol_car_id: data.id
                    })
                }
            }

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

    // const initialData = [
    //     {
    //         id: 1,
    //         ip: 'localhost'
    //     }
    // ]
    //
    // for(const data of initialData) {
    //     if(!ip.includes(data.ip)) {
    //         await WebsocketService.initialize(`ws://${data.ip}:3031`);
    //         ip.push(data.ip)
    //     } else {
    //         console.log(`Ignore id ${data.id}!`)
    //     }
    // }
}

(async () => {
    startAggregator()

    await PrismaService.initialize();

    try {
        await AuthController.initialize();

        if (process.env.RECORD_FACE_DETECTION) {
            console.log('Creating keyspace: recognized')
            await FremisnDAO.createKeyspace('recognized');
            console.log('Keyspace created: recognized')

            console.log('Creating keyspace: unrecognized')
            await FremisnDAO.createKeyspace('unrecognized');
            console.log('Keyspace created: unrecognized')
        }

        console.log('Creating recognized_event table')
        await RecognizedEventDAO.createTable();
        console.log("recognized_event table created successfully.");

        console.log('Creating unrecognized_event table')
        await UnrecognizedEventDAO.createTable();
        console.log("unrecognized_event table created successfully.");

        console.log('Creating camera_resolution table')
        await CameraResolutionDAO.createTable();
        console.log("camera_resolution table created successfully.");

        console.log('Creating patrol_cars table')
        await PatrolCarsDAO.createTable();
        console.log("patrol_cars table created successfully.");

        console.log('Creating patrol_cars_coordinates table')
        await PatrolCarsCoordinatesDAO.createTable();
        console.log("patrol_cars_coordinates table created successfully.");

        console.log('Creating event_master_data table')
        await EventMasterDataDAO.createTable();
        console.log("event_master_data table created successfully.");

        console.log('Creating stream_master_data table')
        await StreamMasterDataDAO.createTable();
        console.log("stream_master_data table created successfully.");

        console.log('Creating pipeline_master_data table')
        await PipelineMasterDataDAO.createTable();
        console.log("pipeline_master_data table created successfully.");
    } catch (e) {
        console.log(e);
        return;
    }

    app.listen(PORT, async () => {
        console.log(`Server listening on port ${PORT}!`);
    });
})();
