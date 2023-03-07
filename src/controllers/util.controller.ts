import {NextFunction, Request, Response} from "express";
import EventDAO from "../daos/event.dao";
import {format, getTime, formatDistanceToNow} from 'date-fns';
import moment from 'moment';
import StreamDAO from "../daos/stream.dao";
import {BadRequestError} from "../utils/error.utils";

export default class UtilController {
    static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const output = {today: 0, yesterday: 0, last_7_days: 1, last_30_days: 0, daily_record: {}, heatmap_data: {}, location_data: []}
            const {analytic, stream} = req.query;
            const streamEqualsClause = stream === 'null' ? [{}] : [{stream_id: {equals: stream}}]


            //today's count
            const todaysCount = await EventDAO.getCount(
                {
                    AND: [
                        ...streamEqualsClause,
                        {
                            event_time: {gte: moment().format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
                        },
                        {
                            type: {equals: analytic}
                        }
                    ]
                })

            output.today = todaysCount._count.id;

            //yesterday's count
            const yesterdaysCount = await EventDAO.getCount(
                {
                    AND: [
                        ...streamEqualsClause,
                        {
                            event_time: {gte: moment().subtract(1, 'day').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: new Date(moment().subtract(1, 'day').format('YYYY-MM-DDT23:59:59Z'))}
                        },
                        {
                            type: {equals: analytic}
                        }
                    ]
                })

            output.yesterday = yesterdaysCount._count.id;

            //last 7 day's count
            const last7DaysCount = await EventDAO.getCount(
                {
                    AND: [
                        ...streamEqualsClause,
                        {
                            event_time: {gte: moment().subtract(6, 'day').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
                        },
                        {
                            type: {equals: analytic}
                        }
                    ]
                })

            output.last_7_days = last7DaysCount._count.id;

            //last 30 day's count
            const last30DaysCount = await EventDAO.getCount(
                {
                    AND: [
                        ...streamEqualsClause,
                        {
                            event_time: {gte: moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
                        },
                        {
                            type: {equals: analytic}
                        }
                    ]
                })

            output.last_30_days = last30DaysCount._count.id;

            const last30DaysEvent = await EventDAO.getAll(
                {
                    AND: [
                        ...streamEqualsClause,
                        {
                            event_time: {gte: moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
                        },
                        {
                            type: {equals: analytic}
                        }
                    ],
                })

            last30DaysEvent.forEach(data => {
                // @ts-ignore
                if (!output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')]) {
                    if(analytic === 'NFV4-VC') {
                        // @ts-ignore
                        output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')] = {car: 0, motorcycle: 0, truck: 0, bus: 0}
                    } else {
                        // @ts-ignore
                        output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')] = 1
                    }
                } else {
                    if(analytic === 'NFV4-VC') {
                        // @ts-ignore
                        (output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')])[data.status]++;
                    } else {
                        // @ts-ignore
                        output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')]++;
                    }
                }
            })

            if(Object.keys(output.daily_record).length === 0) output.daily_record = {'': 0}

            const thisWeeksEvent = await EventDAO.getAll(
                {
                    AND: [
                        ...streamEqualsClause,
                        {
                            event_time: {gte: moment().startOf('week').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            event_time: {lte: moment().endOf('week').format('YYYY-MM-DDT00:00:00Z')}
                        },
                        {
                            type: {equals: analytic}
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

            // const countByStreamId = await EventDAO.getCountGroupByStreamId(
            //     {
            //         AND: [
            //             ...streamEqualsClause,
            //             {
            //                 event_time: {gte: moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z')}
            //             },
            //             {
            //                 event_time: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
            //             },
            //             {
            //                 type: {equals: analytic}
            //             }
            //         ]
            //     })

            // @ts-ignore
            const countByStreamId = await EventDAO.getCountGroupByStreamId(stream, analytic)
            // @ts-ignore
            output.location_data = countByStreamId.map(data => ({...data, count: parseInt(data.count)}))

            console.log('output', output.location_data)

            res.send(output);
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getTopVisitors(req : Request, res : Response, next : NextFunction) {
        try {
            let {visitor, stream} = req.query;
            if (!visitor) visitor = "10";

            if (typeof visitor === "string") {
                // @ts-ignore
                let result = await EventDAO.getTopVisitors(parseInt(visitor), stream)

                // @ts-ignore
                result.forEach((data, idx) => {
                    // @ts-ignore
                    result[idx].num_visits = parseInt(result[idx].num_visits)
                })

                res.send(result);
            }

            else {
                return next(new BadRequestError("Visitor bad format."))
            }
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
