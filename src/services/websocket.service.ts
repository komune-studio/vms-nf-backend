import moment from "moment";
import {client as WebsocketClient, connection, server as WebsocketServer} from "websocket";
import * as http from "http";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import DetectionDAO from "../daos/detection.dao";
import StreamDAO from "../daos/stream.dao";
import request from "../utils/api.utils";
import VehicleDetectionDAO from "../daos/vehicle_detection.dao";
import VehicleDAO from "../daos/vehicle.dao";
import FremisnDAO from "../daos/fremisn.dao";
import RecognizedEventDAO from "../daos/recognized_event.dao";
import UnrecognizedEventDAO from "../daos/unrecognized_event.dao";
const requestUrl = `ws://${process.env['NF_IP']}:${process.env['VISIONAIRE_PORT']}/event_channel`;

export default class WebsocketService {
    private static instance: WebsocketService;
    private client : WebsocketClient;
    private server : WebsocketServer;
    private connections : connection[];

    static getInstance(): WebsocketService | null {
        if (!WebsocketService.instance) {
            console.log("Websocket service not initialized.");
            return null;
        }
        return WebsocketService.instance;
    }

    static async initialize(server : http.Server): Promise<void> {
        if (!WebsocketService.instance) {
            WebsocketService.instance = new WebsocketService(server);
        }
    }

    private constructor(server : http.Server) {

        this.connections = [];

        this.client = new WebsocketClient();
        this.server = new WebsocketServer({
            httpServer: server,
            autoAcceptConnections: false,
        });

        this.client.on('connectFailed', (error) => {
            console.log('Connect Error: ' + error.toString());
            console.log("Retrying in 5 seconds...");
            setTimeout(() => {
                this.client.connect(requestUrl);
            }, 5000);
        });

        this.client.on('connect', (connection) => {
            console.log('Websocket Client Connected');

            connection.on('error', (error) => {
                console.log("Connection Error: " + error.toString());
                console.log("Retrying in 5 seconds...");
                setTimeout(() => {
                    this.client.connect(requestUrl);
                }, 5000);
            });
            connection.on('close', () => {
                console.log("Client disconnected. Retrying in 5 seconds...");
                setTimeout(() => {
                    this.client.connect(requestUrl);
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

                if((data.analytic_id === 'NFV4-FR' || data.analytic_id === 'NFV4H-FR') && data.pipeline_data.status === 'KNOWN') {
                    const face = await EnrolledFaceDAO.getByFaceId(data.pipeline_data.face_id);

                    if(face) {
                        const stream = await StreamDAO.getStreamsById([data.stream_id])

                        if(stream.length > 0 && stream[0].latitude && stream[0].longitude) {
                            let geocode = await request(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${stream[0].latitude},${stream[0].longitude}&sensor=true&key=AIzaSyA-gTcxlBrW55343FxPYZNQJdVmd0z3OcA`, 'GET');
``
                            await DetectionDAO.create({
                                enrollment_id: face.id,
                                latitude: stream[0].latitude,
                                longitude: stream[0].longitude,
                                image: Buffer.from(data.image_jpeg, 'base64'),
                                stream_name: stream[0].name,
                                address: geocode.results[0].formatted_address
                            })
                        }


                        console.log(face.id)
                    }
                } else if (data.analytic_id === 'NFV4-LPR2') {
                    const vehicle = await VehicleDAO.getByPlate(data.pipeline_data.plate_number)

                    if(vehicle) {
                        const stream = await StreamDAO.getStreamsById([data.stream_id])

                        let geocode = await request(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${stream[0].latitude},${stream[0].longitude}&sensor=true&key=AIzaSyA-gTcxlBrW55343FxPYZNQJdVmd0z3OcA`, 'GET');

                        console.log({
                            vehicle_id: vehicle.id,
                            latitude: stream[0].latitude,
                            longitude: stream[0].longitude,
                            image: Buffer.from(data.image_jpeg, 'base64'),
                            stream_name: stream[0].name,
                            address: geocode.results[0].formatted_address
                        })

                        await VehicleDetectionDAO.create({
                            vehicle_id: vehicle.id,
                            latitude: stream[0].latitude,
                            longitude: stream[0].longitude,
                            image: Buffer.from(data.image_jpeg, 'base64'),
                            stream_name: stream[0].name,
                            address: geocode.results[0].formatted_address
                        })
                    }
                }
            });
        });

        this.server.on('request', (request) => {
            // Note: add origin verification if necessary
            // if (!originIsAllowed(request.origin)) {
            //     // Make sure we only accept requests from an allowed origin
            //     request.reject();
            //     console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.');
            //     return;
            // }

            const connection = request.accept();
            connection.on('close', () => {
                this.connections = this.connections.filter(c => c !== connection);
            });
            console.log((new Date()) + ' Connection accepted from ' + request.origin + '.');
            this.connections.push(connection);
        });

        this.client.connect(requestUrl);
    }


}
