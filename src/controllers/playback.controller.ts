import {ca} from "date-fns/locale";
import {NextFunction, Request, Response} from "express";
import StreamDAO from "../daos/stream.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import PipelineDAO from "../daos/pipeline.dao";
import {requestWithXML} from "../utils/api.utils";
import {NotFoundError} from "../utils/error.utils";
// @ts-ignore
import { toXML } from 'jstoxml';


export default class PlaybackController {
    static async getRTSPUrls(req: Request, res: Response, next: NextFunction) {
        try {
            const content = {
                CMSearchDescription: {
                    searchID: "C77384AD-66A0-0001-E7C2-1151F04F90B0",
                    trackIDList: {
                        trackID: 401
                    },
                    timeSpanList: {
                        timeSpan: {
                            startTime: "2023-09-11T00:00:00Z",
                            endTime: "2023-09-12T00:10:00Z"
                        }
                    },
                    maxResults: 5,
                    searchResultPostion: 0,
                    metadataList: {
                        metadataDescriptor: "//recordType.meta.std-cgi.com"
                    }
                }
            }

            const config = {
                indent: ''
            }

            let xmlBody = toXML(content, config)

            let result = await requestWithXML("http://192.168.103.244/ISAPI/ContentMgmt/search", "POST", xmlBody)

            res.send(result)
        } catch (err) {
            return next(err);
        }
    }
}
