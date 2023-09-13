import {ca} from "date-fns/locale";
import {NextFunction, Request, Response} from "express";
import StreamDAO from "../daos/stream.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import PipelineDAO from "../daos/pipeline.dao";
import {requestWithXML} from "../utils/api.utils";
import {NotFoundError} from "../utils/error.utils";
// @ts-ignore
import { toXML } from 'jstoxml';
import {xml2js} from "xml-js";


export default class PlaybackController {
    static async getRTSPUrls(req: Request, res: Response, next: NextFunction) {
        try {
            let body = req.body

            const config = {
                indent: ''
            }
            let xmlBody = toXML(body, config)

            let responseFromDVR = await requestWithXML("http://192.168.103.244/ISAPI/ContentMgmt/search", "POST", xmlBody)
            // @ts-ignore
            let convertResponseToJSON = xml2js(responseFromDVR)

            res.send(convertResponseToJSON)
        } catch (err) {
            return next(err);
        }
    }
}
