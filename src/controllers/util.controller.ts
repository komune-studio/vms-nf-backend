import {NextFunction, Request, Response} from "express";
import EventDAO from "../daos/event.dao";
import LogsDao from "../daos/logs.dao";
import {format, getTime, formatDistanceToNow} from 'date-fns';
import moment from 'moment';
import StreamDAO from "../daos/stream.dao";
import {BadRequestError} from "../utils/error.utils";

export default class UtilController {
    static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const output = {today: 0, yesterday: 0, last_7_days: 1, last_30_days: 0, daily_record: {}, heatmap_data: {}, location_data: []}

            //today's count
            const todaysCount = await EventDAO.getCount(
                {
                    AND: [
                        {
                            event_time: {gte: moment().format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
                        },
                        {
                            status: {equals: 'KNOWN'}
                        }
                    ]
                })

            output.today = todaysCount._count.id;

            //yesterday's count
            const yesterdaysCount = await EventDAO.getCount(
                {
                    AND: [
                        {
                            event_time: {gte: moment().subtract(1, 'day').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: new Date(moment().subtract(1, 'day').format('YYYY-MM-DDT23:59:59Z'))}
                        },
                        {
                            status: {equals: 'KNOWN'}
                        }
                    ]
                })

            output.yesterday = yesterdaysCount._count.id;

            //last 7 day's count
            const last7DaysCount = await EventDAO.getCount(
                {
                    AND: [
                        {
                            event_time: {gte: moment().subtract(6, 'day').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
                        },
                        {
                            status: {equals: 'KNOWN'}
                        }
                    ]
                })

            output.last_7_days = last7DaysCount._count.id;

            //last 30 day's count
            const last30DaysCount = await EventDAO.getCount(
                {
                    AND: [
                        {
                            event_time: {gte: moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
                        },
                        {
                            status: {equals: 'KNOWN'}
                        }
                    ]
                })

            output.last_30_days = last30DaysCount._count.id;

            const last30DaysEvent = await EventDAO.getAll(
                {
                    AND: [
                        {
                            event_time: {gte: moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
                        },
                        {
                            status: {equals: 'KNOWN'}
                        }
                    ],
                })

            last30DaysEvent.forEach(data => {
                // @ts-ignore
                if (!output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')]) {
                    // @ts-ignore
                    output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')] = 0
                }


                // @ts-ignore
                output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')]++;
            })

            const thisWeeksEvent = await EventDAO.getAll(
                {
                    AND: [
                        {
                            event_time: {gte: moment().startOf('week').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: moment().endOf('week').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            status: {equals: 'KNOWN'}
                        }
                    ]
                })

            thisWeeksEvent.forEach(data => {
                let key;

                // console.log(moment(data.event_time).format('d'))
                if(parseInt(moment(data.event_time).format('m')) > 0) {
                    key = moment(data.event_time).format('YYYY-MM-DDTHH:01:00Z')
                } else {
                    key = moment(data.event_time).subtract(1, 'hour').format('YYYY-MM-DDTHH:01:00Z')
                }

                // @ts-ignore
                if(!output.heatmap_data[key]) {
                    // @ts-ignore
                    output.heatmap_data[key] = 1;
                } else {
                    // @ts-ignore
                    output.heatmap_data[key]++;
                }
            })

            const countByStreamId = await EventDAO.getCountGroupByStreamId(
                {
                    AND: [
                        {
                            event_time: {gte: moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
                        },
                        // {
                        //     status: {equals: 'KNOWN'}
                        // }
                    ]
                })

            const streams = await StreamDAO.getStreams();

            let result = countByStreamId.map(obj => ({
                ...obj,
                stream: streams.find(stream => stream.id = obj.stream_id)
            }))

            // @ts-ignore
            result = result.filter(data => data.stream_id === data.stream.id)

            // @ts-ignore
            output.location_data = result.sort((a, b) => {
                // @ts-ignore
                if (a.stream.name < b.stream.name)
                    return -1;
                // @ts-ignore
                if (a.stream.name > b.stream.name)
                    return 1;
                return 0;
            });

            res.send(output);
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getTopVisitors(req : Request, res : Response, next : NextFunction) {
        try {
            let {visitor} = req.query;
            if (!visitor) visitor = "10";

            if (typeof visitor === "string") {
                let result = await EventDAO.getTopVisitors(parseInt(visitor))
                result = {
                    ...result,
                    num_visits: result.num_visits.toString()
                }
                res.send(result);
            }

            else {
                return next(new BadRequestError("Visitor bad format."))
            }
        } catch (e) {
            return next(e);
        }
    }
}
