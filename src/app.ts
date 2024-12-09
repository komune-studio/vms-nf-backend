import {get} from 'https'
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
import DashboardCustomizationDAO from "./daos/dashboard_customization.dao";
import EnrolledFaceDAO from "./daos/enrolled_face.dao";
import EventDAO from "./daos/event.dao";
import StreamDAO from "./daos/stream.dao";
import crypto from './utils/security.utils';
import axios from "axios";
import {Readable} from 'stream'
import fs from 'fs'
import FormData from "form-data";
import request, {requestWithFile} from "./utils/api.utils";
import moment from "moment";

process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

dotenv.config();

const app = express();
const cron = require('node-cron');

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

const getToken = async () => {
    try {
        await axios.post(`${process.env.DSS_HOST}/brms/api/v1.0/accounts/authorize`, {
            userName: process.env.DSS_USERNAME
        })
    } catch (e) {
        try {
            const publicKey = crypto.generatePublicKey();
            const temp1 = crypto.generateMd5(process.env.DSS_PASSWORD);
            const temp2 = crypto.generateMd5(process.env.DSS_USERNAME + temp1)
            const temp3 = crypto.generateMd5(temp2) // @ts-ignore
            const temp4 = crypto.generateMd5(process.env.DSS_USERNAME + ":" + e.response.data.realm + ":" + temp3); // @ts-ignore
            const signature = crypto.generateMd5(temp4 + ":" + e.response.data.randomKey);

            const response = await axios.post(`${process.env.DSS_HOST}/brms/api/v1.0/accounts/authorize`, {
                signature, // @ts-ignore
                randomKey: e.response.data.randomKey,
                encryptType: "MD5",
                publicKey,
                userName: "system"
            })

            return response.data;
        } catch (e) {
            throw e;
        }
    }
}

const syncDSSData = async () => {
    console.log('Sync Enrollment Data with DSS...')

    try {
        const {token, credential} = await getToken();

        const response = await axios({
            method: 'GET',
            url: `${process.env.DSS_HOST}/obms/api/v1.1/acs/person/page?page=1&pageSize=99999&orgCode=001`,
            headers: {
                'X-Subject-Token': token
            }
        })

        const personIds = [];

        for (const item of response.data.data.pageData) {
            const filename = moment().unix() + ".jpg";

            const file = fs.createWriteStream(filename);

            const {baseInfo} = item

            if(baseInfo.facePicture.includes('http')) {
                const enrollment = await EnrolledFaceDAO.getByPersonId(baseInfo.personId)

                if (Array.isArray(enrollment)) {
                    if (enrollment.length > 0 && baseInfo.facePicture) {
                        console.log('skipping enroll with personId: ' + baseInfo.personId)
                    } else {
                        console.log('trying to enroll with personId: ' + baseInfo.personId)

                        get(`${baseInfo.facePicture}?token=${credential}`, function (response) {
                            response.pipe(file);

                            // after download completed close filestream
                            file.on("finish", async () => {
                                file.close();
                                console.log("Download Completed");

                                try {
                                    const body = new FormData();

                                    body.append('name', baseInfo.firstName + ' ' + baseInfo.lastName);
                                    body.append('status', 'EMPLOYEE')

                                    // if(baseInfo.gender !== '0') {
                                    //     body.append('gender', baseInfo.gender === '1' ? 'male' : 'female')
                                    // }

                                    body.append('images', fs.createReadStream(filename))

                                    let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'POST', body);

                                    console.log(result)
                                    // @ts-ignore
                                    await EnrolledFaceDAO.updateAdditionalInfo(result.enrollment.id, JSON.stringify({
                                        personId: baseInfo.personId
                                    }));

                                    console.log('data enrolled with personId: ' + baseInfo.personId)
                                } catch (e) {
                                    console.log('error when trying to enroll with personId: ' + baseInfo.personId)
                                    console.log(e)
                                } finally {
                                    try {
                                        fs.rmSync(filename)
                                    } catch (e) {
                                        console.log(e)
                                    }
                                }
                            });
                        });
                    }
                }
            }
        }

        /*
        const deletedIds: any = await EnrolledFaceDAO.getFaceExcludePersonIds(personIds.join(','))

        for (const item of deletedIds) {
            console.log('trying to delete with id: ' + item.id.toString())

            try {
                await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${item.id.toString()}`, 'DELETE');
                console.log('data deleted with id: ' + item.id.toString())
            } catch (e) {
                console.log('error when trying to delete with id: ' + item.id.toString())
                console.log(e)
            }
        }
         */
    } catch (e) {
        console.log(e)
    }
}

const initializeDSSScheduler = async () => {
    syncDSSData()

    cron.schedule('0 * * * *', () => {
        syncDSSData()
    });
}

const deletePipelineFromStoppedMp4 = async () => {
    try {
        const allMp4 = await StreamDAO.getAllMp4();

        for (const stream of allMp4) {
            try {
                const response = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${stream.node_num}/${stream.id}`, "GET")

                if (response.stream_stats.state === 'TERMINATING') {
                    await request(`${process.env.NF_VISIONAIRE_API_URL}/pipeline/${stream.node_num}/${stream.id}/NFV4-FR`, "DELETE");

                    // @ts-ignore
                    await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${stream.node_num}/${stream.id}`, "PUT", {
                        stream_name: stream.name,
                        stream_address: stream.address, // @ts-ignore
                        stream_custom_data: {...stream.custom_data, autoreplay: true}
                    })
                }
                console.log(response.stream_stats)
            } catch (e) {
                console.log(e)
            }
        }
    } catch (e) {
        console.log(e)
    }
}

const initializeDeletePipelineScheduler = async () => {
    deletePipelineFromStoppedMp4()

    cron.schedule('* * * * *', () => {
        deletePipelineFromStoppedMp4()
    });
}

(async () => {
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

        if (!isAppNameInitialized) {
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
    initializeDeletePipelineScheduler()
    initializeDSSScheduler()
})();
