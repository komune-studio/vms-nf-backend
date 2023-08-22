import moment from "moment";
import {client as WebsocketClient, connection, server as WebsocketServer} from "websocket";
import * as http from "http";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import RecognizedEventDAO from "../daos/recognized_event.dao";
import UnrecognizedEventDAO from "../daos/unrecognized_event.dao";
import FremisnDAO from "../daos/fremisn.dao";
import FaceImageDAO from "../daos/face_image.dao";

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

                let label = '';
                let status = '';
                let result = '';
                let primaryImage = null;

                if (data.analytic_id === 'NFV4-FR') {
                    status = data.pipeline_data.status;

                    if (data.pipeline_data.status === 'KNOWN') {
                        const enrollment = await EnrolledFaceDAO.getByFaceId(data.pipeline_data.face_id);

                        if(enrollment) {
                            const faceImage = await FaceImageDAO.getThumbnailByEnrolledFaceIds([enrollment.id])

                            if(faceImage[0].image_thumbnail) {
                                primaryImage = faceImage[0].image_thumbnail.toString('base64');
                            }

                            result = (data.pipeline_data.similarity === 1 ? "99.99" : Math.floor(data.pipeline_data.similarity * 100)) + "% - " + enrollment.name
                        }

                        label = 'recognized';
                    } else {
                        label = 'unrecognized';
                        result = data.pipeline_data.face_id
                    }
                } else if (data.analytic_id === 'NFV4-LPR' || data.analytic_id === 'NFV4-LPR2') {
                    result = data.pipeline_data.label;
                    label = data.pipeline_data.plate_number
                }

                const detection = {...data};
                delete detection.image_jpeg;

                payload = {
                    type: data.analytic_id,
                    detection,
                    stream_id: data.stream_id,
                    primary_image: primaryImage,
                    secondary_image: data.image_jpeg,
                    result: {
                        location: data.stream_name,
                        label,
                        result,
                        timestamp: moment.unix(data.timestamp).utc().format("YYYY-MM-DDTHH:mm:ss") + 'Z'
                    },
                    status,
                    event_time: moment.unix(data.timestamp).utc().format('YYYY-MM-DD HH:mm:ss+00'),
                    event_id: data.pipeline_data.event_id,
                    latitude: data.stream_latitude,
                    longitude: data.stream_longitude
                }

                // console.log(payload)
                console.log(this.connections.length)
                this.connections.forEach(c => c.sendUTF(JSON.stringify(payload)));
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
