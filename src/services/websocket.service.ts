import moment from "moment";
import {client as WebsocketClient, connection, server as WebsocketServer} from "websocket";
import * as http from "http";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import RecognizedEventDAO from "../daos/recognized_event.dao";
import UnrecognizedEventDAO from "../daos/unrecognized_event.dao";
import FremisnDAO from "../daos/fremisn.dao";

// const requestUrl = `ws://${process.env['NF_IP']}:${process.env['VISIONAIRE_PORT']}/event_channel`;

export default class WebsocketService {
    private static instance: WebsocketService;
    private client : WebsocketClient;
    private connections : connection[];

    static getInstance(): WebsocketService | null {
        if (!WebsocketService.instance) {
            console.log("Websocket service not initialized.");
            return null;
        }
        return WebsocketService.instance;
    }

    static async initialize(url : string): Promise<void> {
        WebsocketService.instance = new WebsocketService(url);
    }

    private constructor(url : string) {

        this.connections = [];

        this.client = new WebsocketClient();

        this.client.on('connectFailed', (error) => {
            console.log('Connect Error: ' + error.toString());
            console.log("Retrying in 5 seconds...");
            setTimeout(() => {
                this.client.connect(url);
            }, 5000);
        });

        this.client.on('connect', (connection) => {
            console.log('Websocket Client Connected');

            connection.on('error', (error) => {
                console.log("Connection Error: " + error.toString());
                console.log("Retrying in 5 seconds...");
                setTimeout(() => {
                    this.client.connect(url);
                }, 5000);
            });
            connection.on('close', () => {
                console.log("Client disconnected. Retrying in 5 seconds...");
                setTimeout(() => {
                    this.client.connect(url);
                }, 5000);
            });
            connection.on('message', async (message) => {
                if (message.type !== 'utf8') return;
                const data = JSON.parse(message.utf8Data);

                let payload : any;

                if(data.analytic_id === 'NFV4-FR' || data.analytic_id === 'NFV4H-FR') {
                    payload = {
                        timestamp: data.timestamp,
                        stream_name: data.stream_name,
                        image: Buffer.from(data.image_jpeg, 'base64')
                    }

                    const response = await FremisnDAO.faceEnrollment(data.pipeline_data.status === 'KNOWN' ? 'recognized' : 'unrecognized', data.image_jpeg)
                    payload.face_id = BigInt(response.face_id)

                    if(data.pipeline_data.status === 'KNOWN') {
                        const face = await EnrolledFaceDAO.getByFaceId(data.pipeline_data.face_id);

                        if(!face) return;

                        payload.enrollment_id = face.id

                        await RecognizedEventDAO.create(payload)
                    } else {
                        await UnrecognizedEventDAO.create(payload)
                    }
                }

                // console.log(payload)
                console.log(this.connections.length)
                this.connections.forEach(c => c.sendUTF(JSON.stringify(payload)));
            });
        });

        this.client.connect(url);
    }


}
