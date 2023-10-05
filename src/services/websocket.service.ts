import {connection, server as WebsocketServer} from "websocket";
import * as http from "http";

const rtsp = require('rtsp-ffmpeg');

export default class WebsocketService {
    private static instance: WebsocketService;
    private server : WebsocketServer;
    private connections : connection[];
    private rtsp : any[];

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
        this.rtsp = []; //

        this.server = new WebsocketServer({
            httpServer: server,
            autoAcceptConnections: false,
        });

        this.server.on('request', (request) => {
            // @ts-ignore
            let {stream, start_time, end_time} = request.resourceURL.query;

            const connection = request.accept();

            if(stream) {
                stream = `${stream}?starttime=${start_time}&endtime=${end_time}`

                console.log(stream)

                // @ts-ignore
                connection.stream = stream

                if(this.rtsp.filter(data => data.stream === stream).length === 0) {
                    const ffmpeg = new rtsp.FFMpeg({
                        input: stream
                    });
                    const connections = this.connections;
                    const pipeStream = function(data : any) {
                        // @ts-ignore
                        connections.filter(connection => connection.stream === stream).forEach(c => c.sendUTF(JSON.stringify({
                            image: data.toString('base64')
                        })));
                    };

                    ffmpeg.on('data', pipeStream);

                    this.rtsp.push({stream, ffmpeg, pipeStream});

                    ffmpeg.on('stop', () => {
                        console.log('stream stopped')
                    })
                }
            }

            connection.on('close', () => {
                this.connections = this.connections.filter(c => c !== connection);

                // @ts-ignore
                if(this.connections.filter(c => stream === c.stream).length === 0) {
                    const {ffmpeg, pipeStream} =  this.rtsp.filter(data => data.stream === stream)[0];
                    ffmpeg.removeListener('data', pipeStream);

                    this.rtsp = this.rtsp.filter(r => r.stream !== stream);
                }
            });
            console.log((new Date()) + ' Connection accepted from ' + request.origin + '.');
            this.connections.push(connection);
        });
    }
}
