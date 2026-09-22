import {NextFunction, Request, Response} from "express";
import EventDAO from "../daos/event.dao";
import {format, getTime, formatDistanceToNow} from 'date-fns';
import moment from 'moment';
import StreamDAO from "../daos/stream.dao";
import request from "../utils/api.utils";
import {BadRequestError} from "../utils/error.utils";
import AdminDAO from "../daos/admin.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import buildCameraDetailSummary from "../services/camera_detail_summary.service";

export default class UtilController {
    static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const output = {}

            let {interval, stream, analytic, start_date, end_date, fetch} = req.query;

            // @ts-ignore
            if (interval && interval != '0' && !isNaN(parseInt(interval))) {
                // @ts-ignore
                interval = parseInt(interval);
            } else {
                // @ts-ignore
                interval = 86400
            }


            if (end_date === 'undefined') {
                end_date = undefined;
            }

        

            if (!analytic || analytic === 'null') {
                if (fetch === 'people_count') {
                    // @ts-ignore
                    const peopleCount = await EventDAO.getPeopleCount(stream.split(','), start_date, end_date)

                    // @ts-ignore
                    output.people_count = peopleCount;
                }

                if(fetch === 'vehicle_count') {
                    const vehicleCount = await EventDAO.getVehicleCount(
                        // @ts-ignore
                        stream.split(','),
                        // @ts-ignore
                        moment(start_date.replace(' ', '+')).format('YYYY-MM-DDTHH:mm:00Z'),
                        // @ts-ignore
                        end_date ? moment(end_date.replace(' ', '+')).format('YYYY-MM-DDTHH:mm:00Z') : undefined
                    )

                    // @ts-ignore
                    output.vehicle_count = vehicleCount;
                }


                if(fetch === 'avg_vehicle_dwelling') {
                    // @ts-ignore
                    const avgVehicleDwelling = await EventDAO.getAvgDuration(stream.split(','), start_date, end_date)


                    // @ts-ignore
                    output.avg_vehicle_dwelling = avgVehicleDwelling[0].avg || 0;
                }

                if(fetch === 'people_and_vehicle_summary') {
                    // @ts-ignore
                    const peopleAndVehicleCountGroupByTime = await EventDAO.getCountPeopleAndVehicleGroupByTime(stream.split(','), start_date, end_date, interval);

                    // @ts-ignore
                    output.people_and_vehicle_summary = {}

                    // @ts-ignore
                    peopleAndVehicleCountGroupByTime.forEach(data => {
                        const key = moment(data.interval_alias).format('DD-MM-YYYY HH:mm');

                        // @ts-ignore
                        if (!output.people_and_vehicle_summary[key]) {
                            // @ts-ignore
                            (output.people_and_vehicle_summary[key]) = {'NFV4-MPAA': 0, 'NFV4-MVA': 0};
                        }

                        // @ts-ignore
                        (output.people_and_vehicle_summary[key])[data.type] = parseInt(data.count);
                    })
                }
            } else if (analytic === 'NFV4-PC' || analytic === 'NFV4-VC' || analytic === 'NFV4-MPAA') {
                const streams = await StreamDAO.getAll();

                if(fetch === 'summary') {
                    // @ts-ignore
                    let countGroupByTime = await EventDAO.getCountGroupByStatusAndTimeAndLocation(stream.split(','), start_date, end_date, analytic, interval);

                    // @ts-ignore
                    countGroupByTime.forEach(data => {
                        streams.forEach(stream => {
                            if (data.stream_id === stream.id) {
                                data.location = stream.name;
                            }
                        })
                    })

                    // @ts-ignore
                    output.summary = {}
                    // @ts-ignore
                    output.summary_location = {}


                    // @ts-ignore
                    countGroupByTime.forEach(data => {
                        const key = moment(data.interval_alias).format('DD-MM-YYYY HH:mm');

                        // @ts-ignore
                        if (!output.summary[key]) {
                            if (analytic === 'NFV4-VC') {
                                // @ts-ignore
                                output.summary[key] = {car: 0, motorcycle: 0, bus: 0, truck: 0}
                            } else if (analytic === 'NFV4-MPAA') {
                                // @ts-ignore
                                output.summary[key] = {Male: 0, Female: 0}
                            } else {
                                // @ts-ignore
                                output.summary[key] = 0
                            }
                        }

                        if (analytic === 'NFV4-VC') {
                            // @ts-ignore
                            (output.summary[key])[data.status] += parseInt(data.count);
                        } else if (analytic === 'NFV4-MPAA') {
                            // @ts-ignore
                            (output.summary[key])[data.gender] += parseInt(data.count);
                        } else {
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
                }

                if(fetch === 'detailed_summary_location') {
                    // @ts-ignore
                    let countGroupByLocation = await EventDAO.getCountGroupLocation(stream.split(','), start_date, end_date, analytic);

                    // @ts-ignore
                    countGroupByLocation.forEach(data => {
                        streams.forEach(stream => {
                            if (data.stream_id === stream.id) {
                                data.location = stream.name;
                            }
                        })
                    })

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
                                    if (value.stream_id === data.stream_id && value.location === data.location) {
                                        return accumulator + value.count;
                                    }

                                    return accumulator
                                }, 0)
                            }
                        })

                        // @ts-ignore
                        output.detailed_summary_location.sort((a, b) => b.total_vehicles - a.total_vehicles)
                    }

                    if (analytic === 'NFV4-MPAA') {
                        // @ts-ignore
                        output.detailed_summary_location = output.detailed_summary_location.map(data => {
                            // @ts-ignore
                            return {
                                // @ts-ignore
                                ...data, total_people: output.detailed_summary_location.reduce((accumulator, value) => {
                                    if (value.stream_id === data.stream_id && value.location === data.location) {
                                        return accumulator + value.count;
                                    }

                                    return accumulator
                                }, 0)
                            }
                        })

                        // @ts-ignore
                        output.detailed_summary_location.sort((a, b) => b.total_people - a.total_people)
                    }
                }

                if(fetch === 'heatmap_data') {
                    // @ts-ignore
                    const countGroupByTimeAndStatus = await EventDAO.getCountGroupByTimeAndStatus(stream.split(','), analytic, start_date, end_date, interval)

                    // @ts-ignore
                    output.heatmap_data = []

                    if (analytic === 'NFV4-VC') {
                        // @ts-ignore
                        countGroupByTimeAndStatus.forEach(data => {
                            // @ts-ignore
                            output.heatmap_data.push({
                                label: data.status,
                                event_time: data.interval_alias,
                                count: parseInt(data.count)
                            })
                        })
                    } else if (analytic === 'NFV4-MPAA') {
                        // @ts-ignore
                        countGroupByTimeAndStatus.forEach(data => {
                            // @ts-ignore
                            output.heatmap_data.push({
                                label: data.gender,
                                event_time: data.interval_alias,
                                count: parseInt(data.count)
                            })
                        })
                    } else {
                        // @ts-ignore
                        countGroupByTimeAndStatus.forEach(data => {
                            // @ts-ignore
                            output.heatmap_data.push({
                                event_time: data.interval_alias,
                                avg: Math.round(data.avg * 100) / 100,
                            })
                        })
                    }
                }
            } else {
                const streams = await StreamDAO.getAll()

                if(fetch === 'summary') {
                    // @ts-ignore
                    let avgGroupByTime = await EventDAO.getAvgGroupByTime(stream.split(','), start_date, end_date, interval);

                    // @ts-ignore
                    output.summary = {}

                    // @ts-ignore
                    avgGroupByTime.forEach(data => {
                        const key = moment(data.interval_alias).format('DD-MM-YYYY HH:mm');

                        // @ts-ignore
                        output.summary[key] = {avg_dwelling_time: data.avg, total_vehicles: parseInt(data.count)}
                    })
                }

                if(fetch === 'summary_location') {
                    // @ts-ignore
                    let avgGroupByLocation = await EventDAO.getAvgGroupByLocation(stream.split(','), start_date, end_date);

                    // @ts-ignore
                    avgGroupByLocation.forEach(data => {
                        streams.forEach(stream => {
                            if (data.stream_id === stream.id) {
                                data.location = stream.name;
                            }
                        })
                    })

                    // @ts-ignore
                    output.summary_location = {}

                    // @ts-ignore
                    avgGroupByLocation.forEach(data => {
                        // @ts-ignore
                        (output.summary_location[data.location]) = parseInt(data.count);
                    });
                }

                if(fetch === 'detailed_summary_location') {
                    // @ts-ignore
                    let countGroupByLocation = await EventDAO.getCountGroupLocation(stream.split(','), start_date, end_date, analytic);

                    // @ts-ignore
                    countGroupByLocation.forEach(data => {
                        streams.forEach(stream => {
                            if (data.stream_id === stream.id) {
                                data.location = stream.name;
                            }
                        })
                    })

                    // @ts-ignore
                    output.detailed_summary_location = countGroupByLocation.map(data => ({
                        ...data,
                        count: parseInt(data.count)
                    }))
                }
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


            if (end_date === 'undefined') {
                end_date = undefined;
            }

            const output = {};

            // @ts-ignore
            const response = await EventDAO.getCountGroupByStatusAndTimeAndLocation(stream.split(','), start_date, end_date, analytic, interval);


            // Argumennya tidak bergantung pada baris mana pun, jadi nilainya sama
            // untuk semua stream. Dulu dipanggil di dalam loop dengan penjaga
            // `!dwellingAvgs[stream_id]`; begitu hasilnya 0 atau null penjaga itu
            // tidak pernah terpenuhi sehingga query full-scan yang sama diulang
            // untuk SETIAP baris hasil.
            const overallAvgDwelling = analytic === 'NFV4-VD' && response.length
                // @ts-ignore
                ? (await EventDAO.getAvgDuration(stream.split(','), start_date, end_date))[0]?.avg
                : undefined

            const totalAvgStream : any = {}

            // @ts-ignore
            for(const data of response) {
                const key = moment(data.interval_alias).format('YYYY-MM-DDTHH:mm:ssZ');

                // @ts-ignore
                if (!output[key]) {
                    const initialValue = {}

                    // @ts-ignore
                    stream.split(',').forEach(id => {
                        // @ts-ignore
                        initialValue[id] = 0;
                    })

                    // @ts-ignore
                    output[key] = initialValue
                }

                if (analytic === 'NFV4-VD') {
                    // @ts-ignore
                    if(!totalAvgStream[data.stream_id]) {
                        totalAvgStream[data.stream_id] = data.sum
                    } else {
                        totalAvgStream[data.stream_id] += data.sum
                    }

                    // @ts-ignore
                    (output[key])[data.stream_id] = {avg_dwelling_time: data.avg, total_dwelling_time: data.sum, overall_avg: overallAvgDwelling}

                } else {
                    // @ts-ignore
                    (output[key])[data.stream_id] += parseInt(data.count)
                }
            }
            if (analytic === 'NFV4-VD') {
                for (const date of Object.keys(output)) {
                    // @ts-ignore
                    for (const streamId of Object.keys(output[date])) {
                        // @ts-ignore
                        const entry = (output[date])[streamId];

                        // Tiap bucket diisi awal dengan angka 0 untuk SEMUA stream
                        // yang diminta, lalu hanya stream yang benar-benar punya
                        // data dwelling di bucket itu yang ditimpa objek. Sisanya
                        // tetap berupa angka, dan menulis properti ke primitif
                        // melempar TypeError di strict mode -- inilah penyebab
                        // error 500 "Cannot create property 'overall_total' on
                        // number '0'" saat membandingkan kamera yang sebagian
                        // tidak punya event dwelling.
                        //
                        // Angka 0 sengaja dibiarkan apa adanya: StackedBarChart
                        // dan PieChart di dashboard sudah menanganinya lewat
                        // `if (val.total_dwelling_time) ... else return val`.
                        if (typeof entry !== 'object' || entry === null) continue;

                        entry.overall_total = totalAvgStream[streamId];
                    }
                }
            }

            res.send(output);
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getRanking(req: Request, res: Response, next: NextFunction) {
        try {
            const {analytic_id} = req.params;
            const {stream, start_date, end_date, interval} = req.query

            const streams = await StreamDAO.getAll();

            // @ts-ignore
            const response = await EventDAO.getRanking(stream.split(','), analytic_id, start_date, end_date, interval);



            // @ts-ignore
            response.forEach(data => {
                streams.forEach(stream => {
                    if (data.stream_id === stream.id) {
                        data.location = stream.name;
                    }
                })
            })

            // @ts-ignore
            res.send(response.map(data => ({
                ...data,
                // interval_alias: moment(data.interval_alias).format('YYYY-MM-DDTHH:mm:ssZ'),
                count: parseInt(data.count)
            })))
        } catch (e) {
            return next(e);
        }
    }

    static async getCameraDetailSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const {analytic_id, stream_id, time} = req.params;
            const {interval, start_time, end_time, line} = req.query;

            const result = await buildCameraDetailSummary({
                analytic_id,
                stream_id,
                time,
                interval,
                start_time,
                end_time,
                line
            });

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
