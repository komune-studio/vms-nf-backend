// @ts-nocheck
import {NextFunction, Request, Response} from "express";
const querystring = require('querystring');
const axios = require('axios');
const https = require('https');
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    requestCert: false,
    agent: false,
});
const instance = axios.create({ httpsAgent })

export default class FaceMeController {
    static async getToken(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await instance.post(`${process.env.FACEME_API_URL}/api_key/auth`, querystring.stringify({
                apiKey: process.env.FACEME_API_KEY,
                appId: 'com.cyberlink.platform.faceme',
                appSecret: 'FaceMe#1'
            }), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                }
            });

            console.log(result)
        } catch (e) {
            if(e.response.data) {
                return res.status(e.response.data.statusCode).send({
                    error: e.response.data.statusDescription,
                    message: e.response.data.errorMessage
                });
            }
            return next(e);
        }
    }
}
