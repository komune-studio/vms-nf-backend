// @ts-nocheck
import { NextFunction, Request, Response } from "express";
import { BadRequestError, NotFoundError } from "../utils/error.utils";
import EventDAO from "../daos/event.dao";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import moment from "moment";
import StreamDAO from "../daos/stream.dao";
import buildEventSummary from "../services/event_summary.service";
import buildExportData from "../services/export_data.service";
import { analyticName } from "../utils/analytic.utils";
import buildEventListPDF from "../utils/event_report.utils";
import buildExportDataWorkbook from "../utils/export_data_workbook.utils";
import { collectPDF } from "../utils/pdf.utils";
const json2csv = require('json2csv').parse;

const MAX_PDF_ROWS = 1000;

export default class EventController {



    static async exportData(req: Request, res: Response, next: NextFunction) {
        try {
            const analytics = req.query.analytic.split(',');
            const streams = req.query.streams.split(',');
            const { start_date, end_date, preview } = req.query;

            const { rows, columns } = await buildExportData(analytics, streams, start_date, end_date);

            if (preview === 'true') return res.send(rows)

            const csv = json2csv(rows, ['stream', ...columns.map(column => column.key)]);

            res.attachment('exported-data.csv');

            return res.send(csv)
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async exportDataExcel(req: Request, res: Response, next: NextFunction) {
        const { analytic, streams, start_date, end_date } = req.query;

        if (!analytic || !streams) {
            return next(new BadRequestError({
                analytic: !analytic ? "Analytic is not defined." : undefined,
                streams: !streams ? "Streams is not defined." : undefined
            }))
        }

        try {
            const analytics: string[] = analytic.split(',').filter(Boolean);
            const streamIds: string[] = streams.split(',').filter(Boolean);

            const { rows, columns } = await buildExportData(analytics, streamIds, start_date, end_date);


            const cameraNames = rows
                .map((row: any) => row.stream)
                .filter(Boolean)
                .sort((a: string, b: string) => a.localeCompare(b));

            const workbook = await buildExportDataWorkbook({
                startDate: start_date ?? null,
                endDate: end_date ?? null,
                cameraNames,
                analyticNames: analytics.map(id => analyticName(id)),
                columns,
                rows
            });

            const filename = [
                'export-data',
                moment(start_date).format('YYYYMMDD'),
                moment(end_date).format('YYYYMMDD'),
                moment().format('HHmm')
            ]
                .map(part => String(part ?? '').replace(/[^a-zA-Z0-9-_]+/g, '_'))
                .filter(Boolean)
                .join('_');

            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
            res.setHeader('Content-Length', workbook.length);

            return res.send(workbook);
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        let { keyword, status, stream, page, limit, analytic, start_date, end_date, download } = req.query;

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


            // @ts-ignore
            const streams: string[] = stream ? stream.split(',') : [];

            // @ts-ignore
            let event = await EventDAO.getAllWithPagination(keyword, status, streams, analytic, startDate, endDate, download ? null : parseInt(page), download ? null : parseInt(limit));

            if (download) {
                const fields = ['Result', 'Timestamp', 'Location'];

                const docs = event.map(item => ({
                    result: item.result.label + ` (${item.result.result})`,
                    timestamp: item.event_time,
                    location: item.detection.stream_name
                }))

                const data = json2csv(docs, fields);

                res.attachment('event-history.csv');

                return res.send(data)
            }

            // @ts-ignore
            let count = await EventDAO.getCountWithPagination(keyword, status, streams, analytic, startDate, endDate);

            const additional_info = await buildEventSummary(analytic, streams, startDate, endDate);

            // @ts-ignore
            res.send({
                ...additional_info,
                total_page: Math.floor(((parseInt(count[0].count) - 1) / limit) + 1),
                total_data: parseInt(count[0].count),
                data: event.map(item => {
                    // @ts-ignore
                    return {
                        ...item,
                        id: parseInt(item.id),
                        primary_image: Buffer.from(item.primary_image).toString('base64'),
                        secondary_image: Buffer.from(item.secondary_image).toString('base64')
                    }
                })
            });
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getByFaceId(req: Request, res: Response, next: NextFunction) {
        const faceId = req.params.face_id;

        try {
            // @ts-ignore
            let enrollment = await EnrolledFaceDAO.getByFaceId(faceId);

            if (!enrollment) {
                return next(new NotFoundError("Enrollment does not exist."))
            }

            // @ts-ignore
            let events = await EventDAO.getByFaceId(faceId);

            res.send({
                enrollment: { ...enrollment, face_id: enrollment.face_id.toString() },
                events: events.map(item => {
                    return {
                        ...item,
                        primary_image: Buffer.from(item.primary_image).toString('base64'),
                        secondary_image: Buffer.from(item.secondary_image).toString('base64')
                    }
                })
            });
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getByEventId(req: Request, res: Response, next: NextFunction) {
        const eventId = req.params.event_id;

        try {
            // @ts-ignore
            let event = await EventDAO.getByEventId(eventId);

            if (!event) {
                return next(new NotFoundError("Event not found.", "event_id"));
            }

            res.send({ ...event, primary_image: Buffer.from(event.primary_image).toString('base64'), secondary_image: Buffer.from(event.secondary_image).toString('base64') });
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async exportDataPdf(req: Request, res: Response, next: NextFunction) {
        const { keyword, status, stream, count, analytic, start_date, end_date } = req.query;

        const requested = parseInt(count);

        if (!Number.isFinite(requested) || requested < 1) {
            return next(new BadRequestError({
                count: "Count must be a positive number."
            }))
        }

        try {
            const startDate = start_date ? moment(new Date(start_date)).format('YYYY-MM-DDTHH:mm:00Z') : null;
            const endDate = end_date ? moment(new Date(end_date)).format('YYYY-MM-DDTHH:mm:00Z') : null;

            const streams: string[] = stream ? stream.split(',').filter(Boolean) : [];

            const selectedCameras = streams.length > 0 ? await StreamDAO.getStreamsById(streams) : [];
            const cameraNames = selectedCameras
                .map((camera: any) => camera.name)
                .filter(Boolean)
                .sort((a: string, b: string) => a.localeCompare(b));

            const total = await EventDAO.getCountWithPagination(keyword, status, streams, analytic, startDate, endDate);
            const totalData = parseInt(total[0].count);

            const size = Math.min(requested, MAX_PDF_ROWS, totalData);

            const events = size > 0
                ? await EventDAO.getAllWithPagination(keyword, status, streams, analytic, startDate, endDate, 1, size)
                : [];

            const summary = await buildEventSummary(analytic, streams, startDate, endDate);
            const rows = events.map(item => EventController.toReportRow(item, analytic));

            const doc = buildEventListPDF({
                analyticName: analyticName(analytic),
                startDate,
                endDate,
                keyword: keyword && keyword !== 'null' ? keyword : null,
                cameraNames,
                totalData,
                exportedCount: rows.length,
                ...EventController.summaryTiles(analytic, summary, totalData),
                rows
            });

            const pdf = await collectPDF(doc);

            const filename = ['event-history', analytic, moment().format('YYYYMMDD-HHmm')]
                .map(part => String(part ?? '').replace(/[^a-zA-Z0-9-_]+/g, '_'))
                .filter(Boolean)
                .join('_');

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
            res.setHeader('Content-Length', pdf.length);

            return res.send(pdf);
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }


    private static toReportRow(item: any, analytic: any) {
        let resultText: string = item.result?.result ?? '';
        let label: string | null = analytic === 'NFV4-MPAA'
            ? item.detection?.pipeline_data?.attributes?.gender?.label ?? null
            : item.result?.label ?? null;

        if (item.type === 'NFV4-PPE') {
            resultText = resultText
                .replace("v:", "vest:")
                .replace("h:", "helmet:")
                .replace("hoh:", "helmet on head:")
                .replace("g:", "glasses:")
                .split(", ").join("\n");

            label = null;
        }

        const isLicensePlate = item.type === 'NFV4-LPR2';
        const hasPlatePattern = typeof resultText === 'string' && resultText.includes('-');

        const labelTone = (item.status === 'KNOWN' || (isLicensePlate && hasPlatePattern)) ? 'success'
            : (item.status === 'UNKNOWN' || (isLicensePlate && !hasPlatePattern)) ? 'error'
                : 'primary';

        const image = item.secondary_image ?? item.primary_image;

        return {
            image: image ? Buffer.from(image) : null,
            result: item.status === 'UNKNOWN' ? null : resultText,
            label: label ? String(label).toUpperCase() : null,
            labelTone,

            timestamp: moment(item.event_time).format('DD MMM YYYY h:mm A'),
            location: item.detection?.stream_name ?? '-'
        };
    }

    private static summaryTiles(analytic: any, summary: any, totalData: number) {
        const toLocale = (value: any) => (Number(value) || 0).toLocaleString('id-ID');

        if (analytic === 'NFV4-VC') {
            return {
                headline: { label: 'Total', value: toLocale(totalData) },
                tiles: [
                    { label: 'Car', value: toLocale(summary.car) },
                    { label: 'Motorcycle', value: toLocale(summary.motorcycle) },
                    { label: 'Bus', value: toLocale(summary.bus) },
                    { label: 'Truck', value: toLocale(summary.truck) }
                ],
                perRow: 4
            };
        }

        if (analytic === 'NFV4-MPAA') {
            return {
                headline: { label: 'Total', value: toLocale(totalData) },
                tiles: [
                    { label: 'Male', value: toLocale(summary.Male) },
                    { label: 'Female', value: toLocale(summary.Female) }
                ],
                perRow: 2
            };
        }

        if (analytic === 'NFV4-VD') {
            return {
                headline: {
                    label: 'Average Dwelling Time',
                    value: `${(Number(summary.avg) || 0).toFixed(2)}s`
                },
                tiles: [{ label: 'Vehicles', value: toLocale(totalData), plain: true }],
                perRow: 2
            };
        }

        return {
            headline: { label: 'Total', value: toLocale(totalData) },
            tiles: [],
            perRow: 2
        };
    }

}
