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
import EventDAO from "../daos/event.dao";
import request from "../utils/api.utils";

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

    private constructor(server: http.Server, requestUrl: string, updateData: boolean | undefined = true) {

        this.connections = [];

        this.client = new WebsocketClient();

        this.client.on('connectFailed', (error) => {
            console.log('Connect Error: ' + error.toString());
            console.log("Retrying in 5 seconds...");
            setTimeout(() => {
                this.client.connect(requestUrl);
            }, 5000);
        });

        this.client.on('connect', (connection) => {
            console.log(`Websocket Client Connected`);

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


                if (data.analytic_id === 'NFV4-FR' || data.analytic_id === 'NFV4H-FR') {
                    const face = await EnrolledFaceDAO.getByFaceId(data.pipeline_data.face_id);

                    if (face) {
                        if (face.additional_info.site_access) {
                            const mapSiteStream = await MapSiteStreamDAO.getByStreamId(data.stream_id)

                            if (mapSiteStream) {
                                const siteId = parseInt(mapSiteStream.site_id);

                                if (!face.additional_info.site_access.includes(siteId)) {
                                    await EventDAO.updateUnauthorized(moment.unix(data.timestamp).format('YYYY-MM-DDTHH:mm:ssZ'), data.pipeline_data.event_id)
                                }
                            }
                        }
                    }

                    if (process.env.PENUGASAN_API_URL) {
                        try {
                            console.log(`${process.env.PENUGASAN_API_URL}/license/stream/${data.stream_id}?task_status=IN_PROGRESS`)

                            let result = await request(`${process.env.PENUGASAN_API_URL}/license/stream/${data.stream_id}?task_status=IN_PROGRESS`, "GET")

                            if(result.length > 0 && result[0].licenseTaskUsers.length > 0) {
                                if(result[0].licenseTaskUsers[0].user_id && result[0].licenseTaskUsers[0].current_latitude && result[0].licenseTaskUsers[0].current_longitude) {
                                    await EventDAO.updateCoordinateAndOfficerInfo(moment.unix(data.timestamp).format('YYYY-MM-DDTHH:mm:ssZ'), data.pipeline_data.event_id, result[0].licenseTaskUsers[0].current_latitude, result[0].licenseTaskUsers[0].current_longitude, result[0].licenseTaskUsers[0].user_id)
                                }
                            }
                        } catch (e) {
                            console.log(e)
                        }
                    }

                    // console.log(data.pipeline_data.event_id)
                    // console.log(data.stream_id)
                    // console.log(moment.unix(data.timestamp).format('YYYY-MM-DDTHH:mm:ssZ'));
                }
            });
        });

        this.client.connect(requestUrl);
    }


}
