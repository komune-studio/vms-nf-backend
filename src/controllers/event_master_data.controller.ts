// @ts-nocheck
import {NextFunction, Request, Response} from "express";
import {BadRequestError, NotFoundError} from "../utils/error.utils";
import EventMasterDataDAO from "../daos/event_master_data.dao";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import moment from "moment";

const json2csv = require('json2csv').parse;
export default class EventMasterDataController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        let {keyword, status, stream, page, limit, analytic, start_date, end_date, download, system} = req.query;

        download = download === 'true';

        if (!page || !limit) {
            return next(new BadRequestError({
                page: !page ? "Page is not defined." : undefined,
                limit: !limit ? "Limit is not defined." : undefined,
            }))
        }

        try {
            const startDate = start_date ? moment(new Date(start_date)).format('YYYY-MM-DDTHH:mm:00Z') : null;
            const endDate = end_date ? moment(new Date(end_date)).format('YYYY-MM-DDTHH:mm:00Z') : null;

            if(stream) {
                stream = "'" + stream.split(',').join("', '") + "'"
                stream = `(${stream})`
            }

            // @ts-ignore
            let event = await EventMasterDataDAO.getAllWithPagination(keyword, status, stream, analytic, startDate, endDate, download ? null : parseInt(page), download ? null : parseInt(limit), system && system !== 'null' ? system : undefined);

            // @ts-ignore
            let count = await EventMasterDataDAO.getCountWithPagination(keyword, status, stream, analytic, startDate, endDate, system && system !== 'null' ? system : undefined);

            // @ts-ignore
            res.send({
                total_page:  Math.floor(((parseInt(count[0].count) - 1) / limit) + 1),
                total_data: parseInt(count[0].count),
                data: event.map(item => {
                    // @ts-ignore
                    return {
                        ...item,
                        primary_image: item.primary_image ? Buffer.from(item.primary_image).toString('base64') : null,
                        secondary_image: item.secondary_image ?  Buffer.from(item.secondary_image).toString('base64') : null
                    }
                })
            });
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
