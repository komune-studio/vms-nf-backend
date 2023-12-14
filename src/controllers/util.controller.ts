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
            const output = {}

            let {interval, stream, analytic, start_date, end_date} = req.query;
            console.log()

            // @ts-ignore
            if (interval && interval != '0' && !isNaN(parseInt(interval))) {
                // @ts-ignore
                interval = parseInt(interval);
            } else {
                // @ts-ignore
                interval = 86400
            }



            if(end_date === 'undefined') {
                end_date = undefined;
            }

            if (!analytic || analytic === 'null') {
                // @ts-ignore
                const peopleCount = await EventDAO.getCount(
                    {
                        AND: [  // @ts-ignore
                            {stream_id: {in: stream.split(',')}},
                            {  // @ts-ignore
                                event_time: {gte: start_date}
                            },
                            { // @ts-ignore
                                event_time: {lte: end_date}
                            },
                            {
                                type: {equals: 'NFV4-PC'}
                            }
                        ]
                    })

                const vehicleCount = await EventDAO.getCount(
                    {
                        AND: [  // @ts-ignore
                            {stream_id: {in: stream.split(',')}},
                            {  // @ts-ignore
                                event_time: {gte: moment(start_date.replace(' ', '+')).format('YYYY-MM-DDTHH:mm:00Z')}
                            },
                            { // @ts-ignore
                                event_time: {lte: end_date ? moment(end_date.replace(' ', '+')).format('YYYY-MM-DDTHH:mm:00Z') : undefined}
                            },
                            {
                                type: {equals: 'NFV4-VC'}
                            }
                        ]
                    })

                // @ts-ignore
                const avgVehicleDwelling = await EventDAO.getAvgDuration(stream.split(','), start_date, end_date)

                // @ts-ignore
                output.people_count = peopleCount._count.id;
                // @ts-ignore
                output.vehicle_count = vehicleCount._count.id;
                // @ts-ignore
                output.avg_vehicle_dwelling = avgVehicleDwelling[0].avg || 0;

                // @ts-ignore
                output.avg_vehicle_dwelling = avgVehicleDwelling[0].avg || 0;

                // @ts-ignore
                const peopleAndVehicleCountGroupByTime = await EventDAO.getCountPeopleAndVehicleGroupByTime(stream.split(','), start_date, end_date, interval);

                console.log(peopleAndVehicleCountGroupByTime)

                // @ts-ignore
                output.people_and_vehicle_summary = {}

                // @ts-ignore
                peopleAndVehicleCountGroupByTime.forEach(data => {
                    const key = moment(data.interval_alias).format('DD-MM-YYYY HH:mm');

                    // @ts-ignore
                    if (!output.people_and_vehicle_summary[key]) {
                        // @ts-ignore
                        (output.people_and_vehicle_summary[key]) = {'NFV4-PC': 0, 'NFV4-VC': 0};
                    }

                    // @ts-ignore
                    (output.people_and_vehicle_summary[key])[data.type] = parseInt(data.count);
                })

                console.log(output)
            } else if (analytic === 'NFV4-PC' || analytic === 'NFV4-VC' || analytic === 'NFV4-MPAA') {
                // @ts-ignore
                let countGroupByTime = await EventDAO.getCountGroupByStatusAndTimeAndLocation(stream.split(','), start_date, end_date, analytic, interval);
                // @ts-ignore
                let countGroupByLocation = await EventDAO.getCountGroupLocation(stream.split(','), start_date, end_date, analytic);


                const streams = await StreamDAO.getAll();

                // @ts-ignore
                countGroupByTime.forEach(data => {
                    streams.forEach(stream => {
                        if(data.stream_id === stream.id) {
                            data.location = stream.name;
                        }
                    })
                })

                // @ts-ignore
                countGroupByLocation.forEach(data => {
                    streams.forEach(stream => {
                        if(data.stream_id === stream.id) {
                            data.location = stream.name;
                        }
                    })
                })

                // @ts-ignore
                output.summary = {}
                // @ts-ignore
                output.summary_location = {}
                // @ts-ignore
                output.detailed_summary_location = countGroupByLocation.map(data => ({
                    ...data,
                    count: parseInt(data.count)
                }))

                if (analytic === 'NFV4-VC') {
                    // @ts-ignore
                    output.detailed_summary_location = output.detailed_summary_location.map(data => {
                        // @ts-ignore
                        return {
                            // @ts-ignore
                            ...data, total_vehicles: output.detailed_summary_location.reduce((accumulator, value) => {
                                if(value.stream_id === data.stream_id && value.location === data.location) {
                                    return accumulator + value.count;
                                }

                                return accumulator
                            }, 0)
                        }
                    })

                    // @ts-ignore
                    output.detailed_summary_location.sort((a, b) =>  b.total_vehicles - a.total_vehicles)

                    // @ts-ignore
                    console.log(output.detailed_summary_location)
                }

                if (analytic === 'NFV4-MPAA') {
                    // @ts-ignore
                    output.detailed_summary_location = output.detailed_summary_location.map(data => {
                        // @ts-ignore
                        return {
                            // @ts-ignore
                            ...data, total_people: output.detailed_summary_location.reduce((accumulator, value) => {
                                if(value.stream_id === data.stream_id && value.location === data.location) {
                                    return accumulator + value.count;
                                }

                                return accumulator
                            }, 0)
                        }
                    })

                    // @ts-ignore
                    output.detailed_summary_location.sort((a, b) =>  b.total_people - a.total_people)

                    // @ts-ignore
                    console.log(output.detailed_summary_location)
                }

                // @ts-ignore
                countGroupByTime.forEach(data => {
                    const key = moment(data.interval_alias).format('DD-MM-YYYY HH:mm');

                    // @ts-ignore
                    if (!output.summary[key]) {
                        if(analytic === 'NFV4-VC') {
                            // @ts-ignore
                            output.summary[key] = {car: 0, motorcycle: 0, bus: 0, truck: 0}
                        } else if(analytic === 'NFV4-MPAA') {
                            // @ts-ignore
                            output.summary[key] = {Male: 0, Female: 0}
                        } else {
                            // @ts-ignore
                            output.summary[key] = 0
                        }
                    }

                    if(analytic === 'NFV4-VC') {
                        // @ts-ignore
                        (output.summary[key])[data.status] += parseInt(data.count);
                    } else if(analytic === 'NFV4-MPAA') {
                        // @ts-ignore
                        (output.summary[key])[data.status] += parseInt(data.count);
                     }else {
                        // @ts-ignore
                        (output.summary[key]) += parseInt(data.count);
                    }

                    // @ts-ignore
                    if (!output.summary_location[data.location]) {
                        // @ts-ignore
                        output.summary_location[data.location] = 0
                    }

                    // @ts-ignore
                    (output.summary_location[data.location]) += parseInt(data.count);
                })
            } else {
                // @ts-ignore
                let avgGroupByTime = await EventDAO.getAvgGroupByTime(stream.split(','), start_date, end_date, interval);
                // @ts-ignore
                let avgGroupByLocation = await EventDAO.getAvgGroupByLocation(stream.split(','), start_date, end_date);
                // @ts-ignore
                let countGroupByLocation = await EventDAO.getCountGroupLocation(stream.split(','), start_date, end_date, analytic);

                const streams = await StreamDAO.getAll()

                // @ts-ignore
                avgGroupByLocation.forEach(data => {
                    streams.forEach(stream => {
                        if(data.stream_id === stream.id) {
                            data.location = stream.name;
                        }
                    })
                })

                // @ts-ignore
                countGroupByLocation.forEach(data => {
                    streams.forEach(stream => {
                        if(data.stream_id === stream.id) {
                            data.location = stream.name;
                        }
                    })
                })

                // @ts-ignore
                output.summary = {}
                // @ts-ignore
                output.summary_location = {}
                // @ts-ignore
                output.detailed_summary_location = countGroupByLocation.map(data => ({
                    ...data,
                    count: parseInt(data.count)
                }))

                // @ts-ignore
                avgGroupByLocation.forEach(data => {
                    // @ts-ignore
                    (output.summary_location[data.location]) = parseInt(data.count);
                });

                // @ts-ignore
                avgGroupByTime.forEach(data => {
                    const key = moment(data.interval_alias).format('DD-MM-YYYY HH:mm');

                    // @ts-ignore
                    output.summary[key] = data.avg
                })
            }

            res.send(output);
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async compare(req: Request, res: Response, next: NextFunction) {
        try {
            let {interval, stream, analytic, start_date, end_date} = req.query;

            // @ts-ignore
            if (interval && interval != '0' && !isNaN(parseInt(interval))) {
                // @ts-ignore
                interval = parseInt(interval);
            } else {
                // @ts-ignore
                interval = 86400
            }



            if(end_date === 'undefined') {
                end_date = undefined;
            }

            const output = {};

            // @ts-ignore
            const response = await EventDAO.getCountGroupByStatusAndTimeAndLocation(stream.split(','), start_date, end_date, analytic, interval);

            // @ts-ignore
            response.forEach(data => {
                const key = moment(data.interval_alias).format('YYYY-MM-DDTHH:mm:ssZ');

                // @ts-ignore
                if(!output[key]) {
                    const initialValue = {}

                    // @ts-ignore
                    stream.split(',').forEach(id => {
                        // @ts-ignore
                        initialValue[id] = 0;
                    })

                    // @ts-ignore
                    output[key] = initialValue
                }

                // @ts-ignore
                (output[key])[data.stream_id] = analytic === 'NFV4-VD' ? data.avg : parseInt(data.count);
            })

            res.send(output);
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getRanking(req: Request, res: Response, next: NextFunction) {
        try {
            const {analytic_id} = req.params;
            const {stream, start_date, end_date} = req.query

            const streams = await StreamDAO.getAll();

            // @ts-ignore
            const response = await EventDAO.getRanking(stream.split(','), analytic_id, start_date, end_date);

            // @ts-ignore
            response.forEach(data => {
                streams.forEach(stream => {
                    if(data.stream_id === stream.id) {
                        data.location = stream.name;
                    }
                })
            })

            // @ts-ignore
            res.send(response.map(data => ({
                ...data,
                interval_alias: moment(data.interval_alias).format('DD-MM-YYYY'),
                count: parseInt(data.count)
            })))
        } catch (e) {
            return next(e);
        }
    }

    static async getCameraDetailSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const {analytic_id, stream_id, time} = req.params;
            let {interval, start_time, end_time} = req.query;

            // @ts-ignore
            if (interval && !isNaN(parseInt(interval))) {
                // @ts-ignore
                interval = parseInt(interval);
            } else {
                // @ts-ignore
                interval = 3600
            }

            const ranking: any = {};
            let startTime = moment()
            let endTime = null;

            if (time === 'this_week') {
                startTime = moment().startOf('isoWeeks');
            } else if (time === 'this_month') {
                startTime = moment().startOf('month');
            } else if (time === 'custom') {
                // @ts-ignore
                startTime = moment(start_time);
                // @ts-ignore
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
                    if (!ranking[data.interval_alias]) {
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

                result.ranking = Object.entries(ranking)   // @ts-ignore
                    .sort(([, a], [, b]) => b - a)
                    .reduce((r, [k, v]) => ({...r, [k]: v}), {});

                //only return top 3 ranking
                Object.keys(result.ranking).forEach((key, idx) => {
                    if (idx > 2) {
                        delete result.ranking[key]
                    }
                })
            } else if (analytic_id === 'NFV4-MPAA') {
                result = {Male: 0, Female: 0, heatmap_data: []}

                // @ts-ignore
                const response = await EventDAO.getCountGroupByTimeAndStatus([stream_id], analytic_id, startTime, endTime, interval)

                // @ts-ignore
                response.forEach(data => {
                    if (!ranking[data.interval_alias]) {
                        ranking[data.interval_alias] = parseInt(data.count)
                    } else {
                        ranking[data.interval_alias] += parseInt(data.count)
                    }


                    result[data.gender] += parseInt(data.count);
                    result.heatmap_data.push({
                        label: data.gender,
                        event_time: data.interval_alias,
                        count: parseInt(data.count)
                    })
                })

                result.ranking = Object.entries(ranking)   // @ts-ignore
                    .sort(([, a], [, b]) => b - a)
                    .reduce((r, [k, v]) => ({...r, [k]: v}), {});

                //only return top 3 ranking
                Object.keys(result.ranking).forEach((key, idx) => {
                    if (idx > 2) {
                        delete result.ranking[key]
                    }
                })
            } else if (analytic_id === 'NFV4-VD') {
                result = {max: {}, min: {}, avg: 0, total_data: 0, heatmap_data: []}

                // @ts-ignore
                const response = await EventDAO.getCountGroupByTimeAndStatus([stream_id], analytic_id, startTime, endTime, interval)
                // @ts-ignore
                const avgDurationResponse = await EventDAO.getAvgDuration([stream_id], startTime, endTime)
                // @ts-ignore
                const maxDurationResponse = await EventDAO.getMaxDuration(stream_id, startTime, endTime)
                // @ts-ignore
                const minDurationResponse = await EventDAO.getMinDuration(stream_id, startTime, endTime)

                // @ts-ignore
                if (avgDurationResponse.length > 0) {
                    // @ts-ignore
                    result.avg = avgDurationResponse[0].avg;

                    // @ts-ignore
                    result.total_data = parseInt(avgDurationResponse[0].total_data);
                }

                // @ts-ignore
                if (maxDurationResponse.length > 0) {
                    // @ts-ignore
                    result.max = maxDurationResponse[0];
                }

                // @ts-ignore
                if (minDurationResponse.length > 0) {
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
                    .sort(([, a], [, b]) => b.avg - a.avg)
                    .reduce((r, [k, v]) => ({...r, [k]: v}), {});

                //only return top 3 ranking
                Object.keys(result.ranking).forEach((key, idx) => {
                    if (idx > 2) {
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

                result.ranking = Object.entries(ranking)   // @ts-ignore
                    .sort(([, a], [, b]) => b - a)
                    .reduce((r, [k, v]) => ({...r, [k]: v}), {});

                //only return top 3 ranking
                Object.keys(result.ranking).forEach((key, idx) => {
                    if (idx > 2) {
                        delete result.ranking[key]
                    }
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
