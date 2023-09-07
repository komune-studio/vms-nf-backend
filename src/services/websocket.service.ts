import moment from "moment";
import {client as WebsocketClient, connection, server as WebsocketServer} from "websocket";
import * as http from "http";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import EventMasterDataDAO from "../daos/event_master_data.dao";
import UnrecognizedEventDAO from "../daos/unrecognized_event.dao";
import FremisnDAO from "../daos/fremisn.dao";
import VehicleDAO from "../daos/vehicle.dao";

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

    static async initialize(url : string, id : BigInt): Promise<void> {
        WebsocketService.instance = new WebsocketService(url, id);
    }

    private constructor(url : string, id : BigInt) {

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

                if(data.type === 'NFV4-LPR2') {
                    const isPlateNumberExists = await VehicleDAO.getVehicleByPlate(data.detection.pipeline_data.plate_number);

                    if(isPlateNumberExists) {
                        data.result.result = `${data.result.result}-${isPlateNumberExists.status}-${isPlateNumberExists.name}`
                        data.status = 'KNOWN'
                    } else {
                        data.status = 'UNKNOWN'
                    }
                }

                let payload : any;

                await EventMasterDataDAO.create({
                    ...data,
                    primary_image: data.primary_image ? new Buffer(data.primary_image, 'base64') : null,
                    secondary_image: new Buffer(data.secondary_image, 'base64'),
                    event_time: new Date(data.event_time),
                    patrol_car_id: id
                })

                // console.log(payload)
                console.log(this.connections.length)
                this.connections.forEach(c => c.sendUTF(JSON.stringify(payload)));
            });
        });

        this.client.connect(url);
    }


}
