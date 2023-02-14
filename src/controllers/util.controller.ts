import {NextFunction, Request, Response} from "express";
import EventDAO from "../daos/event.dao";
import LogsDao from "../daos/logs.dao";
import {format, getTime, formatDistanceToNow} from 'date-fns';
import moment from 'moment';

export default class UtilController {
    static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const output = {total_employee: 0, total_clock_in: 0, total_clock_out: 1, daily_record: {}}

            console.log()

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
                    ]
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

            const countByStreamId = await EventDAO.getCountGroupByStreamId(
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

            console.log(countByStreamId)

            res.send(output);
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
