import {client as WebsocketClient, connection, server as WebsocketServer} from "websocket";
import * as http from "http";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import FaceImageDAO from "../daos/face_image.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import VisitationDAO from "../daos/visitation.dao";

const requestUrl = 'ws://localhost:4004/event_channel';

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
                // if (data.primary_text === "UNKNOWN") return;
                // console.log(data);

                const payload : any = {
                    analytic_id: data.analytic_id,
                    label: data.primary_text === "UNKNOWN" ? "unrecognized" : "recognized",
                    location: data.stream_name,
                    primary_image: "",
                    result: data.pipeline_data.face_id,
                    secondary_image: data.image_jpeg,
                    stream_id: data.stream_id,
                    timestamp: new Date(data.timestamp * 1000),
                }

                if (data.primary_text !== "UNKNOWN") {
                    console.log("Known face detected")
                    const face = await EnrolledFaceDAO.getByFaceId(data.primary_text);
                    if (!face) {
                        console.log("Face not found in database")
                        return;
                    }
                    const image = await FaceImageDAO.getByEnrolledFaceId(face.id);
                    if (!image) {
                        console.log("Image not found in database")
                        return
                    }
                    payload.primary_image = image[0].image_thumbnail?.toString('base64') || "";
                    payload.result = `${(data.pipeline_data.similarity * 100).toFixed(1)}% - ${face.name}`
                    payload.status = face.status;

                    const visitData = await VisitationDAO.getByEnrolledFaceId(face.id);
                    console.log(visitData)
                    if (visitData.length > 0) {
                        const site = await MapSiteStreamDAO.getByStreamId(data.stream_id);
                        if (site)
                            payload.allowed_here = visitData[0].allowed_sites.includes(site.site_id)
                    }
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