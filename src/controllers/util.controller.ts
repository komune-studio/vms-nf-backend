import {NextFunction, Request, Response} from "express";
import EventDAO from "../daos/event.dao";
import EventAggregateService from "../services/event_aggregate.service";
import {format, getTime, formatDistanceToNow} from 'date-fns';
import moment from 'moment';
import StreamDAO from "../daos/stream.dao";
import request from "../utils/api.utils";
import {BadRequestError} from "../utils/error.utils";
import AdminDAO from "../daos/admin.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import buildCameraDetailSummary from "../services/camera_detail_summary.service";
import buildDashboardReport from "../services/dashboard_report.service";
import * as DashboardSummary from "../services/dashboard_summary.service";
import buildDashboardPDF from "../utils/dashboard_report.utils";
import {collectPDF} from "../utils/pdf.utils";

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

        

            // @ts-ignore
            const streams: string[] = stream ? stream.split(',') : [];

            if (!analytic || analytic === 'null') {
                if (fetch === 'people_count') {
                    // @ts-ignore
                    output.people_count = await DashboardSummary.peopleCount(streams, start_date, end_date);
                }

                if (fetch === 'vehicle_count') {
                    // @ts-ignore
                    output.vehicle_count = await DashboardSummary.vehicleCount(streams, start_date, end_date);
                }

                if (fetch === 'avg_vehicle_dwelling') {
                    // @ts-ignore
                    output.avg_vehicle_dwelling = await DashboardSummary.avgVehicleDwelling(streams, start_date, end_date);
                }

                if (fetch === 'people_and_vehicle_summary') {
                    // @ts-ignore
                    output.people_and_vehicle_summary = await DashboardSummary.peopleAndVehicleSummary(streams, start_date, end_date, interval);
                }
            } else if (analytic === 'NFV4-PC' || analytic === 'NFV4-VC' || analytic === 'NFV4-MPAA') {
                if (fetch === 'summary') {
                    // @ts-ignore
                    const {summary, summary_location} = await DashboardSummary.countingSummary(streams, start_date, end_date, analytic, interval);

                    // @ts-ignore
                    output.summary = summary;
                    // @ts-ignore
                    output.summary_location = summary_location;
                }

                if (fetch === 'detailed_summary_location') {
                    // @ts-ignore
                    output.detailed_summary_location = await DashboardSummary.detailedSummaryLocation(streams, start_date, end_date, analytic);
                }

                if (fetch === 'heatmap_data') {
                    // @ts-ignore
                    output.heatmap_data = await DashboardSummary.heatmapData(streams, start_date, end_date, analytic, interval);
                }
            } else {
                if (fetch === 'summary') {
                    // @ts-ignore
                    output.summary = await DashboardSummary.dwellingSummary(streams, start_date, end_date, interval);
                }

                if (fetch === 'summary_location') {
                    // @ts-ignore
                    output.summary_location = await DashboardSummary.dwellingSummaryLocation(streams, start_date, end_date);
                }

                if (fetch === 'detailed_summary_location') {
                    // @ts-ignore
                    output.detailed_summary_location = await DashboardSummary.detailedSummaryLocation(streams, start_date, end_date, analytic);
                }
            }

            res.send(output);
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    private static async exportDashboard(analytic: string | null, req: Request, res: Response, next: NextFunction) {
        const {stream, start_date, end_date, interval} = req.query;

        if (!stream) {
            return next(new BadRequestError({stream: "Stream is not defined."}));
        }

        try {
            // @ts-ignore
            const streams: string[] = stream.split(',').filter(Boolean);

            // @ts-ignore
            const parsedInterval = interval && interval != '0' && !isNaN(parseInt(interval))
                // @ts-ignore
                ? parseInt(interval)
                : 86400;

            const context = await buildDashboardReport({
                analytic,
                streams,
                startDate: start_date,
                endDate: end_date === 'undefined' ? undefined : end_date,
                interval: parsedInterval
            });

            const pdf = await collectPDF(buildDashboardPDF(context));

            const filename = ['dashboard', context.title, moment().format('YYYYMMDD-HHmm')]
                .map(part => String(part ?? '').replace(/[^a-zA-Z0-9-_]+/g, '_'))
                .filter(Boolean)
                .join('_');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
            res.setHeader('Content-Length', pdf.length);

            return res.send(pdf);
        } catch (e) {
            console.log(e);

            return next(e);
        }
    }

    static async exportGeneral(req: Request, res: Response, next: NextFunction) {
        return UtilController.exportDashboard(null, req, res, next);
    }

    static async exportPeopleCounting(req: Request, res: Response, next: NextFunction) {
        return UtilController.exportDashboard('NFV4-MPAA', req, res, next);
    }

    static async exportVehicleCounting(req: Request, res: Response, next: NextFunction) {
        return UtilController.exportDashboard('NFV4-VC', req, res, next);
    }

    static async exportVehicleDweling(req: Request, res: Response, next: NextFunction) {
        return UtilController.exportDashboard('NFV4-VD', req, res, next);
    }

    static async compare(req: Request, res: Response, next: NextFunction) {
        try {
            let {interval, stream, analytic, start_date, end_date} = req.query;

            // @ts-ignore
            if (interval && interval != '0' && !isNaN(parseInt(interval))) {
                // @ts-ignore
                interval = parseInt(interval);
            } else {
                // @ts-ignoren
                interval = 86400
            }


            if (end_date === 'undefined') {
                end_date = undefined;
            }

            const output = {};

            // @ts-ignore
            const response = await EventAggregateService.getCountGroupByStatusAndTimeAndLocation(stream.split(','), start_date, end_date, analytic, interval);


            // Argumennya tidak bergantung pada baris mana pun, jadi nilainya sama
            // untuk semua stream. Dulu dipanggil di dalam loop dengan penjaga
            // `!dwellingAvgs[stream_id]`; begitu hasilnya 0 atau null penjaga itu
            // tidak pernah terpenuhi sehingga query full-scan yang sama diulang
            // untuk SETIAP baris hasil.
            const overallAvgDwelling = analytic === 'NFV4-VD' && response.length
                // @ts-ignore
                ? (await EventAggregateService.getAvgDuration(stream.split(','), start_date, end_date))[0]?.avg
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
