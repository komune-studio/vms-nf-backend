// @ts-nocheck
import {NextFunction, Request, Response} from "express";
const querystring = require('querystring');
const axios = require('axios');
const https = require('https');
const fs = require('fs');
const moment = require('moment');
const httpsAgent = new https.Agent({
    rejectUnauthorized: false,
    requestCert: false,
    agent: false,
});
const instance = axios.create({ httpsAgent })
const FormData = require('form-data');

export default class FaceMeController {

    static async hitAPI(req: Request, res: Response, next: NextFunction) {
        try {
            const {endpoint, body, token} = req.body

            let result = await instance.post(`${process.env.FACEME_API_URL}${endpoint}`, body, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    Authorization: token
                }
            });

            res.send(result.data ? result.data : {success: true})
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

    static async addPerson(req: Request, res: Response, next: NextFunction) {
        // function to create file from base64 encoded string
        function base64_decode(base64str, file) {
            // create buffer object from base64 encoded string, it is important to tell the constructor that the string is base64 encoded
            const bitmap = new Buffer(base64str, 'base64');
            // write buffer to file
            fs.writeFileSync(file, bitmap);
        }

        const {image, token} = req.body

        const extension = ((image.split(',')[0]).split('/')[1]).split(';')[0]
        const filename = `${moment().unix()}.${extension}`;

        try {
            const filename = `${moment().unix()}.${extension}`;
            base64_decode(image.split(',')[1], filename)

            const body = new FormData();

            body.append('name', req.body.name);
            body.append('image', fs.readFileSync(filename))
            body.append('note', req.body.note);
            body.append('skipQC', "true");

            let result = await instance.post(`${process.env.FACEME_API_URL}/person/add`, body, {
                headers: {
                    ...body.getHeaders(),
                    Authorization: token
                }
            });

            res.send({success: true})
        } catch (e) {
            if(e.response && e.response.data) {
                return res.status(e.response.data.statusCode).send({
                    error: e.response.data.statusDescription,
                    message: e.response.data.errorMessage
                });
            }
            return next(e);
        } finally {
            fs.rmSync(filename)
        }
    }
}