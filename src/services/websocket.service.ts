// @ts-nocheck

import moment from "moment";
import {client as WebsocketClient, connection, server as WebsocketServer} from "websocket";
import * as http from "http";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import RecognizedEventDAO from "../daos/recognized_event.dao";
import UnrecognizedEventDAO from "../daos/unrecognized_event.dao";
import FremisnDAO from "../daos/fremisn.dao";
import FaceImageDAO from "../daos/face_image.dao";

// const requestUrl = `ws://${process.env['NF_IP']}:${process.env['VANILLA_PORT']}/api/event_channel`;

export default class WebsocketService {
    private static instance: WebsocketService;
    private client: WebsocketClient;
    private server: WebsocketServer;
    private connections: connection[];

    static getInstance(): WebsocketService | null {
        if (!WebsocketService.instance) {
            console.log("Websocket service not initialized.");
            return null;
        }
        return WebsocketService.instance;
    }

    static async initialize(server: http.Server, requestUrl: string): Promise<void> {
        if (!WebsocketService.instance) {
            WebsocketService.instance = new WebsocketService(server, requestUrl);
        }
    }

    private constructor(server: http.Server, requestUrl: string) {

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

                // let payload : any;

                if (data.analytic_id === 'NFV4-FR' || data.analytic_id === 'NFV4H-FR') {
                    // payload = {
                    //     timestamp: data.timestamp,
                    //     stream_name: data.stream_name,
                    //     image: Buffer.from(data.image_jpeg, 'base64')
                    // }

                    // const response = await FremisnDAO.faceEnrollment(data.pipeline_data.status === 'KNOWN' ? 'recognized' : 'unrecognized', data.image_jpeg)
                    // payload.face_id = BigInt(response.face_id)

                    if (data.label === 'recognized') {
                        const face = await EnrolledFaceDAO.getByName(data.result.split(" - ")[1]);

                        // const face = await EnrolledFaceDAO.getByFaceId(data.pipeline_data.face_id);
                        // const faceImage = await FaceImageDAO.getThumbnailByEnrolledFaceIds([face.id])
                        //
                        // console.log(faceImage[0].image_thumbnail.toString('base64'))
                        //
                        data.face_status = face.status

                        if (face.additional_info.site_access) {
                            const mapSiteStream = await MapSiteStreamDAO.getByStreamId(data.stream_id)

                            if (mapSiteStream) {
                                const siteId = parseInt(mapSiteStream.site_id);

                                data.unauthorized = !face.additional_info.site_access.includes(siteId)
                            }
                        }

                        // console.log(face)

                        // if(!face) return;
                        //
                        // payload.enrollment_id = face.id

                        // await RecognizedEventDAO.create(payload)
                    } else {
                        // await UnrecognizedEventDAO.create(payload)
                    }
                }

                // console.log(payload)
                console.log(this.connections.length)
                this.connections.forEach(c => c.sendUTF(JSON.stringify(data)));
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
