import {NextFunction, Request, Response} from "express";
import EventDAO from "../daos/event.dao";
import {format, getTime, formatDistanceToNow} from 'date-fns';
import moment from 'moment';
import StreamDAO from "../daos/stream.dao";
import request from "../utils/api.utils";
import {BadRequestError} from "../utils/error.utils";
import AdminDAO from "../daos/admin.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import VisitationDAO from "../daos/visitation.dao";

export default class UtilController {
    static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const admin = await AdminDAO.getById(req.decoded.id);
            let mapSiteStream = [];

            // @ts-ignore
            if(admin.role === 'SUPERADMIN') {
                mapSiteStream = await MapSiteStreamDAO.getAll()
            } else {
                // @ts-ignore
                mapSiteStream = await MapSiteStreamDAO.getBySiteIds(admin.site_access)
            }

            // @ts-ignore


            const output = {
                today: 0,
                today_visitor: 0,
                yesterday: 0,
                last_7_days: 1,
                last_7_days_visitor: 0,
                last_30_days: 0,
                last_30_days_visitor: 0,
                daily_record: {},
                daily_record_visitor: {},
                heatmap_data: {},
                location_data: []
            }
            const {analytic, stream} = req.query;
            const streamEqualsClause = stream === 'null' ? [{stream_id: {in: mapSiteStream.map(siteStream => siteStream.stream_id)}}] : [{stream_id: {equals: stream}}]

            if(analytic === 'NFV4-FR') {
                const todaysCount = await VisitationDAO.getCount(
                    {
                        AND: [
                            {
                                created_at: {gte: moment().format('YYYY-MM-DDT00:00:00Z')}
                            },
                            {
                                created_at: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
                            }
                        ]
                    })

                output.today_visitor = todaysCount._count.id;

                const last7DaysCount = await VisitationDAO.getCount(
                    {
                        AND: [
                            {
                                created_at: {gte: moment().subtract(6, 'day').format('YYYY-MM-DDT00:00:00Z')}
                            },
                            {
                                created_at: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
                            }
                        ]
                    })

                output.last_7_days_visitor = last7DaysCount._count.id;

                //last 30 day's count
                const last30DaysCount = await VisitationDAO.getCount(
                    {
                        AND: [
                            {
                                created_at: {gte: moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z')}
                            },
                            {
                                created_at: {lte: new Date(moment().format('YYYY-MM-DDT23:59:59Z'))}
                            }
                        ]
                    })

                output.last_30_days_visitor = last30DaysCount._count.id;
            }

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


            const visitationCountByTime = await VisitationDAO.getCountGroupByTime();
            // @ts-ignore
            visitationCountByTime.forEach(data => {
                // @ts-ignore
                output.daily_record_visitor[format(new Date(data.interval_alias), 'dd MMM yyyy')] = parseInt(data.count);
            })

            // @ts-ignore
            if(visitationCountByTime.length === 0) {
                output.daily_record_visitor = [{ "": 0 }]
            }

            // @ts-ignore
            const countByTimeAndStatus = await EventDAO.getCountGroupByTimeAndStatus(stream === 'null' ? mapSiteStream.map(siteStream => siteStream.stream_id) : [stream], analytic)

            // @ts-ignore
            countByTimeAndStatus.forEach(data => {
                data.event_time = data.interval_alias

                if (moment(data.event_time).isSameOrAfter(moment().startOf('week').format('YYYY-MM-DDT00:00:00Z')) && moment(data.event_time).isSameOrBefore(moment().endOf('week').format('YYYY-MM-DDT00:00:00Z'))) {
                    let key;

                    // console.log(moment(data.event_time).format('d'))
                    if (parseInt(moment(data.event_time).format('m')) > 0) {
                        key = moment(data.event_time).format('YYYY-MM-DDTHH:01:00Z')
                    } else {
                        key = moment(data.event_time).subtract(1, 'hour').format('YYYY-MM-DDTHH:01:00Z')
                    }

                    // @ts-ignore
                    if (!output.heatmap_data[key]) {
                        // @ts-ignore
                        output.heatmap_data[key] = parseInt(data.count);
                    } else {
                        // @ts-ignore
                        output.heatmap_data[key] += parseInt(data.count);
                    }
                }

                data.status = data.status === 'KNOWN' ? 'recognized' : data.status === 'UNKNOWN' ? 'unrecognized' : data.status
                // @ts-ignore
                if (!output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')]) {
                    if (analytic === 'NFV4-FR') {
                        // @ts-ignore
                        output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')] = {
                            recognized: 0,
                            unrecognized: 0
                        }
                        // @ts-ignore
                        output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')][data.status] += parseInt(data.count);
                    } else if (analytic === 'NFV4-VC') {
                        // @ts-ignore
                        output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')] = {
                            car: 0,
                            motorcycle: 0,
                            truck: 0,
                            bus: 0
                        }
                        // @ts-ignore
                        output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')][data.status] += parseInt(data.count);
                    } else {
                        // @ts-ignore
                        output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')] = parseInt(data.count)
                    }
                } else {
                    if (analytic === 'NFV4-FR' || analytic === 'NFV4-VC') {
                        // @ts-ignore
                        (output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')])[data.status] += parseInt(data.count);
                    } else {
                        // @ts-ignore
                        output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')] += parseInt(data.count);
                    }
                }
            })

            if (Object.keys(output.daily_record).length === 0) output.daily_record = {'': 0}

            // @ts-ignore
            const countByStreamId = await EventDAO.getCountGroupByStreamId(stream === 'null' ? mapSiteStream.map(siteStream => siteStream.stream_id) : [stream], analytic)
            // @ts-ignore
            output.location_data = countByStreamId.map(data => ({...data, count: parseInt(data.count)}))


            res.send(output);
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getTopVisitors(req: Request, res: Response, next: NextFunction) {
        try {
            let {visitor, stream} = req.query;
            if (!visitor) visitor = "10";

            if (typeof visitor === "string") {
                if(stream === 'null') {
                    const admin = await AdminDAO.getById(req.decoded.id);
                    let mapSiteStream = []

                    // @ts-ignore
                    if(admin.role === 'SUPERADMIN') {
                        mapSiteStream = await MapSiteStreamDAO.getAll()
                    } else {
                        // @ts-ignore
                        mapSiteStream = await MapSiteStreamDAO.getBySiteIds(admin.site_access)
                    }

                    stream = mapSiteStream.map(siteStream => siteStream.stream_id);
                } else {
                    // @ts-ignore
                    stream = [stream]
                }

                // @ts-ignore
                if(stream.length === 0) {
                    return res.send([])
                }

                // @ts-ignore
                let result = await EventDAO.getTopVisitors(parseInt(visitor), stream)

                // @ts-ignore
                result.forEach((data, idx) => {
                    // @ts-ignore
                    result[idx].num_visits = parseInt(result[idx].num_visits)
                })

                res.send(result);
            } else {
                return next(new BadRequestError("Visitor bad format."))
            }
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getApiConfig(req: Request, res: Response, next: NextFunction) {
        res.send({
            NF_IP: process.env.NF_IP,
            VANILLA_PORT: process.env.VANILLA_PORT,
            VISIONAIRE_PORT: process.env.VISIONAIRE_PORT
        })
    }

    static async getResourceStats(req: Request, res: Response, next: NextFunction) {
        try {
            const stats = await request(`${process.env.NF_VISIONAIRE_API_URL}/resource_stats`, "GET")
            res.send(stats);
        } catch (e) {
            return next(e);
        }
    }

    static async getNodeStatus(req: Request, res: Response, next: NextFunction) {
        try {
            const nodes = await request(`${process.env.NF_VISIONAIRE_API_URL}/node_status`, "GET")
            res.send(nodes);
        } catch (e) {
            return next(e);
        }
    }
}
