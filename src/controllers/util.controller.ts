import {NextFunction, Request, Response} from "express";
import EventDAO from "../daos/event.dao";
import {format, getTime, formatDistanceToNow} from 'date-fns';
import moment from 'moment';
import StreamDAO from "../daos/stream.dao";
import request from "../utils/api.utils";
import {BadRequestError} from "../utils/error.utils";
import AdminDAO from "../daos/admin.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";

export default class UtilController {
    static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const admin = await AdminDAO.getById(req.decoded.id);
            let mapSiteStream = [];

            // @ts-ignore
            if (admin.role === 'SUPERADMIN') {
                mapSiteStream = await MapSiteStreamDAO.getAll()
            } else {
                // @ts-ignore
                mapSiteStream = await MapSiteStreamDAO.getBySiteIds(admin.site_access)
            }

            // @ts-ignore


            const output = {
                today: 0,
                yesterday: 0,
                last_7_days: 1,
                last_30_days: 0,
                daily_record: {},
                heatmap_data: {},
                location_data: []
            }
            const {analytic, stream} = req.query;

            const streamEqualsClause = stream === 'null' ? [{stream_id: {in: mapSiteStream.map(siteStream => siteStream.stream_id)}}] : [{stream_id: {equals: stream}}]

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

            // @ts-ignore
            const countByTimeAndStatus = await EventDAO.getCountGroupByTimeAndStatus(stream === 'null' ? mapSiteStream.map(siteStream => siteStream.stream_id) : [stream], analytic, moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z'), null, 3600)

            // @ts-ignore
            countByTimeAndStatus.forEach(data => {
                data.event_time = data.interval_alias

                if (moment(data.event_time).isSameOrAfter(moment().startOf('isoWeeks').format('YYYY-MM-DDT00:00:00Z')) && moment(data.event_time).isSameOrBefore(moment().endOf('isoWeeks').format('YYYY-MM-DDT23:59:59Z'))) {
                    let key = moment(data.event_time).format('YYYY-MM-DDTHH:01:00Z')

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
                    if (analytic === 'NFV4-FR' || analytic === 'NFV4H-FR') {
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
                    } else if (analytic === 'NFV4-LPR2') {
                        // @ts-ignore
                        (output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')]) = {PENGHUNI: 0, 'BUKAN PENGHUNI': 0}

                        // @ts-ignore
                        output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')][data.status] = parseInt(data.count);
                    } else {
                        // @ts-ignore
                        output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')] = parseInt(data.count)
                    }
                } else {
                    if (analytic === 'NFV4-FR' || analytic === 'NFV4H-FR' || analytic === 'NFV4-VC') {
                        // @ts-ignore
                        (output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')])[data.status] += parseInt(data.count);
                    } else if (analytic === 'NFV4-LPR2') {
                        // @ts-ignore
                        (output.daily_record[format(new Date(data.event_time), 'dd MMM yyyy')])[data.status] = parseInt(data.count);
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

            console.log(output)

            res.send(output);
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getCameraDetailSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const {analytic_id, stream_id, time} = req.params;
            let {interval, start_time, end_time} = req.body;

            if(interval && !isNaN(parseInt(interval))) {
                interval = parseInt(interval);
            } else {
                interval = 3600
            }

            const ranking : any = {};
            let startTime = moment()
            let endTime = null;

            if (time === 'this_week') {
                startTime = moment().startOf('isoWeeks');
            } else if (time === 'this_month') {
                startTime = moment().startOf('month');
            } else if (time === 'custom') {
                startTime = moment(start_time);
                endTime = moment(end_time).format('YYYY-MM-DDTHH:mm:59Z');
            }

            // @ts-ignore
            startTime = startTime.format(time === 'custom' ? 'YYYY-MM-DDTHH:mm:00Z' : 'YYYY-MM-DDT00:00:00Z');


            let result: any = {}

            if (analytic_id === 'NFV4-FR' || analytic_id === 'NFV4H-FR') {
                result = {KNOWN: 0, UNKNOWN: 0}

                // @ts-ignore
                const response = await EventDAO.getFaceRecognitionSummary(stream_id, startTime)

                response.forEach(data => {
                    // @ts-ignore
                    result[data.status] = parseInt(data._count.id)
                })
            } else if (analytic_id === 'NFV4-LPR2') {
                result = {KNOWN: 0, UNKNOWN: 0}

                // @ts-ignore
                const response = await EventDAO.getLicensePlateRecognitionSummary(stream_id, startTime)

                // @ts-ignore
                if (response.length > 0) {
                    // @ts-ignore
                    if (response[0].KNOWN) {
                        // @ts-ignore
                        result['KNOWN'] = parseInt(response[0].KNOWN)
                    }

// @ts-ignore
                    if (response[0].UNKNOWN) {
                        // @ts-ignore
                        result['UNKNOWN'] = parseInt(response[0].UNKNOWN)
                    }
                }
            } else if (analytic_id === 'NFV4-VC') {
                result = {car: 0, motorcycle: 0, truck: 0, bus: 0, heatmap_data: []}

                // @ts-ignore
                const response = await EventDAO.getCountGroupByTimeAndStatus([stream_id], analytic_id, startTime, endTime, interval)

                // @ts-ignore
                response.forEach(data => {
                    if(!ranking[data.interval_alias]) {
                        ranking[data.interval_alias] = parseInt(data.count)
                    } else {
                        ranking[data.interval_alias] += parseInt(data.count)
                    }


                    result[data.status] += parseInt(data.count);
                    result.heatmap_data.push({
                        label: data.status,
                        event_time: data.interval_alias,
                        count: parseInt(data.count)
                    })
                })
            } else if (analytic_id === 'NFV4-VD') {
                result = {max: {}, min: {}, avg: 0, total_data: 0, heatmap_data: []}

                // @ts-ignore
                const response = await EventDAO.getCountGroupByTimeAndStatus([stream_id], analytic_id, startTime, endTime, interval)
                // @ts-ignore
                const avgDurationResponse = await EventDAO.getAvgDuration(stream_id, startTime, endTime)
                // @ts-ignore
                const maxDurationResponse = await EventDAO.getMaxDuration(stream_id, startTime, endTime)
                // @ts-ignore
                const minDurationResponse = await EventDAO.getMinDuration(stream_id, startTime, endTime)

                // @ts-ignore
                if(avgDurationResponse.length > 0) {
                    // @ts-ignore
                    result.avg = avgDurationResponse[0].avg;

                    // @ts-ignore
                    result.total_data = parseInt(avgDurationResponse[0].total_data);
                }

                // @ts-ignore
                if(maxDurationResponse.length > 0) {
                    // @ts-ignore
                    result.max = maxDurationResponse[0];
                }

                // @ts-ignore
                if(minDurationResponse.length > 0) {
                    // @ts-ignore
                    result.min = minDurationResponse[0];
                }

                // @ts-ignore
                response.forEach(data => {
                    ranking[data.interval_alias] = {avg: data.avg, total_data: parseInt(data.count)}

                    result.heatmap_data.push({
                        event_time: data.interval_alias,
                        avg: Math.round(data.avg * 100) / 100,
                    })
                })

                result.ranking = Object.entries(ranking)   // @ts-ignore
                    .sort(([,a],[,b]) => b.avg-a.avg)
                    .reduce((r, [k, v]) => ({ ...r, [k]: v }), {});

                //only return top 3 ranking
                Object.keys(result.ranking).forEach((key, idx) => {
                    if(idx > 2) {
                        delete result.ranking[key]
                    }
                })
            } else {
                result = {total: 0, heatmap_data: []}

                // @ts-ignore
                const response = await EventDAO.getCountGroupByTimeAndStatus([stream_id], analytic_id, startTime, endTime, interval)

                // @ts-ignore
                response.forEach(data => {
                    ranking[data.interval_alias] = parseInt(data.count)

                    result.total += parseInt(data.count);
                    result.heatmap_data.push({
                        event_time: data.interval_alias,
                        count: parseInt(data.count)
                    })
                })
            }

            res.send(result)
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
                if (stream === 'null') {
                    const admin = await AdminDAO.getById(req.decoded.id);
                    let mapSiteStream = []

                    // @ts-ignore
                    if (admin.role === 'SUPERADMIN') {
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
                if (stream.length === 0) {
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

    static async uploadVideo(req: Request, res: Response, next: NextFunction) {
        try {
            if (req.file) {
                res.send({file: req.file.filename})
            }
        } catch (e) {
            return next(e);
        }
    }

    static async getRecording(req: Request, res: Response, next: NextFunction) {
        try {
            const recording = await request(`${process.env.RECORDING_API_URL}/recording-list`, "GET")

            // @ts-ignore
            res.send(recording.data.map(data => ({
                ...data,
                url: `${process.env.RECORDING_API_URL}/download=${data.file_name}`
            })))
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }
}
