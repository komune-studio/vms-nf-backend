import {ca} from "date-fns/locale";
import {NextFunction, Request, Response} from "express";
import StreamDAO from "../daos/stream.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import PipelineDAO from "../daos/pipeline.dao";
import {requestWithXML} from "../utils/api.utils";
import {NotFoundError} from "../utils/error.utils";
// @ts-ignore
import { toXML } from 'jstoxml';
import {xml2json} from "xml-js";

export default class PlaybackController {
    static async getRTSPUrls(req: Request, res: Response, next: NextFunction) {
        try {
            let body = req.body
            if(!body.base64_auth){
                return res.send({error: "Base64 auth is missing"})
            }
            let base64_auth = body.base64_auth
            delete body.base64_auth

            if(!body.ip_address){
                return res.send({error: "IP address is missing"})
            }
            let ip_address = body.ip_address
            delete body.ip_address

            const config = {
                indent: ''
            }
            let xmlBody = toXML(body, config)

            let responseFromDVR = await requestWithXML(`http://${ip_address}/ISAPI/ContentMgmt/search`, "POST", xmlBody, base64_auth)

            // @ts-ignore
            let result1 = xml2json(responseFromDVR, {compact: true, spaces: 4});

            res.send(JSON.parse(result1))
        } catch (err) {
            return next(err);
        }
    }
}
