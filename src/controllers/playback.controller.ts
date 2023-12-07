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

            res.send(xmlBody)

            let responseFromDVR = await requestWithXML(`http://${ip_address}/ISAPI/ContentMgmt/search`, "POST", xmlBody, base64_auth)

            // @ts-ignore
            let result1 = xml2json(responseFromDVR, {compact: true, spaces: 4});

            res.send(JSON.parse(result1))
        } catch (err) {
            return next(err);
        }
    }

    static async getRTSPAvailableDays(req: Request, res: Response, next: NextFunction) {
        try {
            let prefix = "<?xml version=\"1.0\" encoding=\"utf-8\"?>"
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

            if(!body.track_number){
                return res.send({error: "Track number is missing"})
            }
            let track_number = body.track_number
            delete body.track_number

            const config = {indent: ''}
            let xmlBody = toXML(body, config)
            let responseFromDVR = await requestWithXML(`http://${ip_address}/ISAPI/ContentMgmt/record/tracks/${track_number}/dailyDistribution`, "POST", prefix+xmlBody, base64_auth)


            // @ts-ignore
            let result1 = xml2json(responseFromDVR, {compact: true, spaces: 4});

            let processed = JSON.parse(result1)

            if(processed.trackDailyDistribution.dayList.day && processed.trackDailyDistribution.dayList.day.length > 0){
                processed.trackDailyDistribution.dayList.day = processed.trackDailyDistribution.dayList.day.map((value: { [x: string]: { _text: any; }; id: { _text: any; }; dayOfMonth: { _text: any; }; record: { _text: any; }; }, id: any) => {
                    // @ts-ignore

                    value.id = JSON.parse(value.id._text)
                    value.dayOfMonth = JSON.parse(value.dayOfMonth._text)
                    // @ts-ignore
                    value.record = JSON.parse(value.record._text)

                    if(value.recordType){
                        value.recordType = value.recordType._text
                    }
                    return value
                })
            }

            res.send(processed)
        } catch (err) {
            return next(err);
        }
    }
}
