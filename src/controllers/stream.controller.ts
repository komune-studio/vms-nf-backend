import { ca } from "date-fns/locale";
import { NextFunction, Request, Response } from "express";
import moment from "moment";
import StreamDAO from "../daos/stream.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import PipelineDAO from "../daos/pipeline.dao";
import SiteDAO from "../daos/site.dao";
import buildCameraDetailSummary, { resolveCameraDetailWindow } from "../services/camera_detail_summary.service";
import { analyticName, seatAnalyticId } from "../utils/analytic.utils";
import request from "../utils/api.utils";
import {
    buildHeatmap,
    buildMainChart,
    buildRanking,
    formatDuration,
    heatmapTitle,
    mainChartTitle,
    rankingTitle
} from "../utils/camera_chart_data.utils";
import { renderCartesianChart, renderHeatmap } from "../utils/chart.utils";
import { BadRequestError, NotFoundError } from "../utils/error.utils";
import { collectPDF } from "../utils/pdf.utils";
import buildStreamDetailPDF from "../utils/stream_report.utils";


const RANKING_UNITS: Record<string, string> = {
    'NFV4-VC': 'Vehicle Detected',
    'NFV4-MPAA': 'People Detected',
    'NFV4-VD': 'vehicles'
};

export default class StreamController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const streams = await StreamDAO.getAll();

            const mapSiteStream = await MapSiteStreamDAO.getByStreamIds(streams.map(stream => stream.id))
            const analytics = await PipelineDAO.getByStreamIds(streams.map(stream => stream.id))
            for (const stream of streams) {
                // @ts-ignore
                let result = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${stream.node_num}/${stream.id}`, "GET")
                // @ts-ignore
                stream.stream_stats = result.stream_stats;

                // @ts-ignore
                stream.seats = result.seats;

                // @ts-ignore
                stream.pipelines = [];
                // @ts-ignore
                stream.configs = [];

                mapSiteStream.forEach(siteStream => {
                    if (stream.id === siteStream.stream_id) {
                        // @ts-ignore
                        stream.site_id = parseInt(siteStream.site_id);
                    }
                })

                analytics.forEach(analytic => {
                    if (stream.id === analytic.stream_id) {
                        // @ts-ignore
                        stream.pipelines.push(analytic.analytic_id);
                        // @ts-ignore
                        stream.configs.push(analytic.configs);
                    }
                })
            }

            // @ts-ignore
            res.send(streams)
        } catch (err) {
            console.log(err)
            return next(err);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        const { node } = req.params;

        try {
            let result = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${node}`, "POST", req.body)
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        const { node, id } = req.params;

        try {
            let stream: any = (await StreamDAO.getStreamsById([id]))[0];
            if (!stream) {
                return next(new NotFoundError("Stream not found.", "STREAM"));
            }

            let result = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${node}/${id}`, "GET")

            let pipelines = await PipelineDAO.getByStreamIds([id]);
            stream.pipelines = pipelines.map(pipeline => pipeline.analytic_id);
            // @ts-ignore
            stream.configs = pipelines.map(pipeline => ({ analytic_id: pipeline.analytic_id, ...pipeline.configs }));

            stream.stats = result.stream_stats;
            stream.seats = result.seats;

            res.send(stream);
        } catch (e) {
            return next(e);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        const { node, id } = req.params;
        try {
            let result = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${node}/${id}`, "PUT", req.body)
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }
    static async delete(req: Request, res: Response, next: NextFunction) {
        const { node, id } = req.params;
        try {
            let result = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${node}/${id}`, "DELETE", req.body)
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }



    static async exportStreamDetailPDF(req: Request, res: Response, next: NextFunction) {
        const { node, id } = req.params;
        const { analytic, time, interval, start_time, end_time, line } = req.query;

        try {
            const analyticId = analytic ? String(analytic) : '';

            if (!analyticId || analyticId === 'null') {
                return next(new BadRequestError("Query parameter 'analytic' is required."));
            }

            const timeFrame = time ? String(time) : 'today';
            const lineFilter = !line || line === 'null' ? null : String(line);

            const stream: any = (await StreamDAO.getStreamsById([id]))[0];

            if (!stream) {
                return next(new NotFoundError("Stream not found.", "STREAM"));
            }

            let stats: any = null;
            let seats: any[] = [];

            try {
                const result: any = await request(`${process.env.NF_VISIONAIRE_API_URL}/streams/${node}/${id}`, "GET");

                stats = result?.stream_stats ?? null;
                seats = result?.seats ?? [];
            } catch (e) {
                console.log('exportStreamDetailPDF: gagal mengambil data stream dari Visionaire', e);
            }

            let site: string | null = null;

            const mapSiteStream = await MapSiteStreamDAO.getByStreamId(id);

            if (mapSiteStream) {
                const found = await SiteDAO.getById(Number(mapSiteStream.site_id));
                site = found?.name ?? null;
            }

            const seat = seats.find((entry: any) => entry?.analytic_id === seatAnalyticId(analyticId));

            const summaryRequest = {
                analytic_id: analyticId,
                stream_id: id,
                time: timeFrame,
                interval,
                start_time,
                end_time,
                line: lineFilter
            };

            const summary = await buildCameraDetailSummary(summaryRequest);
            const window = resolveCameraDetailWindow(summaryRequest);

            const mainChart = buildMainChart(analyticId, summary, timeFrame, window.interval);
            const heatmapModel = buildHeatmap(analyticId, summary, timeFrame);

            const mainImage = mainChart ? renderCartesianChart(mainChart.options) : null;
            const heatmapImage = heatmapModel
                ? renderHeatmap({
                    xCategories: heatmapModel.xCategories,
                    yCategories: heatmapModel.yCategories,
                    data: heatmapModel.data,
                    // Sel heatmap dwelling berisi durasi, bukan cacahan.
                    valueFormat: analyticId === 'NFV4-VD' ? formatDuration : undefined
                })
                : null;

            const doc = buildStreamDetailPDF({
                streamName: stream.name,
                address: stream.address ?? null,
                site,
                license: seat?.serial_number ?? null,
                nodeNum: node,
                latitude: stream.latitude ?? null,
                longitude: stream.longitude ?? null,
                state: stats?.state ?? null,
                analytic: analyticId,
                analyticName: analyticName(analyticId),
                time: timeFrame,
                line: lineFilter,
                startTime: window.startTime,
                endTime: window.endTime,
                summary,
                ranking: buildRanking(analyticId, summary),
                rankingTitle: rankingTitle(timeFrame),
                rankingUnit: RANKING_UNITS[analyticId] ?? 'Detections',
                rankingAvgUnit: 'avg. time',
                mainChart: mainImage,
                mainChartTitle: mainChart?.title ?? mainChartTitle(analyticId, timeFrame),
                heatmap: heatmapImage?.buffer ?? null,
                heatmapTitle: heatmapTitle(timeFrame),
                heatmapWidth: heatmapImage?.width ?? 1100,
                heatmapHeight: heatmapImage?.height ?? 160
            });

            const pdf = await collectPDF(doc);

            const filename = [stream.name, analyticId, timeFrame, moment().format('YYYYMMDD-HHmm')]
                .map(part => String(part ?? '').replace(/[^a-zA-Z0-9-_]+/g, '_'))
                .filter(Boolean)
                .join('_');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
            res.setHeader('Content-Length', pdf.length);

            res.send(pdf);
        } catch (e) {
            console.log(e);

            return next(e);
        }
    }


}
