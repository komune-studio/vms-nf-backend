// @ts-nocheck
import {NextFunction, Request, Response} from "express";
import {BadRequestError, NotFoundError} from "../utils/error.utils";
import EventDAO from "../daos/event.dao";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import moment from "moment";
import StreamDAO from "../daos/stream.dao";
const json2csv = require('json2csv').parse;
export default class EventController {
    static async exportData(req: Request, res: Response, next: NextFunction) {
        try {
            // @ts-ignore
            const fields = ['stream'];
            const analytics = req.query.analytic.split(',');
            const streams = req.query.streams.split(',');
            const {start_date, end_date, preview} = req.query;
            const allStreams = (await StreamDAO.getAll()).filter(stream => streams.includes(stream.id));

            let data = []

            allStreams.forEach(stream => {
                data.push({
                    stream: stream.name,
                    stream_id: stream.id
                })
            })

            if(analytics.includes('NFV4-VC')) {
                fields.push('car')
                fields.push('motorcycle')
                fields.push('truck')
                fields.push('bus')

                const response = await EventDAO.getCountGroupLocation(streams, start_date, end_date, 'NFV4-VC')

                data.forEach(datum => {
                    datum['car'] = 0;
                    datum['motorcycle'] = 0;
                    datum['truck'] = 0;
                    datum['bus'] = 0;

                    response.forEach(data => {
                        if(datum.stream_id === data.stream_id) {
                            datum[data.status] = parseInt(data.count);
                        }
                    })
                })
            }

            if(analytics.includes('NFV4-MPAA')) {
                fields.push('male')
                fields.push('female')

                const response = await EventDAO.getCountGroupLocation(streams, start_date, end_date, 'NFV4-MPAA')

                data.forEach(datum => {
                    datum['male'] = 0;
                    datum['female'] = 0;

                    response.forEach(data => {
                        if(datum.stream_id === data.stream_id) {
                            datum[data.gender.toLowerCase()] = parseInt(data.count);
                        }
                    })
                })
            }

            if(analytics.includes('NFV4-PC')) {
                fields.push('people')

                const response = await EventDAO.getCountGroupLocation(streams, start_date, end_date, 'NFV4-PC')

                data.forEach(datum => {
                    datum['people'] = 0;

                    response.forEach(data => {
                        if(datum.stream_id === data.stream_id) {
                            datum['people'] = parseInt(data.count);
                        }
                    })
                })
            }

            if(analytics.includes('NFV4-VD')) {
                fields.push('average')

                const response = await EventDAO.getCountGroupLocation(streams, start_date, end_date, 'NFV4-VD')

                data.forEach(datum => {
                    datum['average'] = 0;

                    response.forEach(data => {
                        if(datum.stream_id === data.stream_id) {
                            datum['average'] = data.avg;
                        }
                    })
                })
            }

            data.forEach(datum => {
                delete datum.stream_id
            })

            if(preview === 'true') return res.send(data)

            const csv = json2csv(data, fields);

            res.attachment('exported-data.csv');

            return res.send(csv)
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        let {keyword, status, stream, page, limit, analytic, start_date, end_date, download} = req.query;

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

            if(stream) {
                stream = "'" + stream.split(',').join("', '") + "'"
                stream = `(${stream})`
            }

            // @ts-ignore
            let event = await EventDAO.getAllWithPagination(keyword, status, stream, analytic, startDate, endDate, download ? null : parseInt(page), download ? null : parseInt(limit));

            if(download) {
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
            let count = await EventDAO.getCountWithPagination(keyword, status, stream, analytic, startDate, endDate);

            let additional_info = {}

            if(analytic === 'NFV4-VC') {
                additional_info = {car: 0, motorcycle: 0, bus: 0, truck: 0};

                let countGroupByStatus = await EventDAO.getCountGroupByStatus(analytic, stream, startDate, endDate)

                countGroupByStatus.forEach(data => {
                    additional_info[data.status] = parseInt(data.count);
                })
            } else if (analytic === 'NFV4-VD') {
                additional_info = {avg: 0};

                let avg = await EventDAO.getAvg(stream, startDate, endDate)

                additional_info.avg = avg[0].avg;
            } else if (analytic === 'NFV4-MPAA') {
                additional_info = {Male: 0, Female: 0};

                let countGroupByGender = await EventDAO.getCountGroupByGender(stream, startDate, endDate)

                countGroupByGender.forEach(data => {
                    additional_info[data.gender] = parseInt(data.count);
                })
            }

            // @ts-ignore
            res.send({
                ...additional_info,
                total_page:  Math.floor(((parseInt(count[0].count) - 1) / limit) + 1),
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

            if(!enrollment) {
                return next(new NotFoundError("Enrollment does not exist."))
            }

            // @ts-ignore
            let events = await EventDAO.getByFaceId(faceId);

            res.send({
                enrollment: {...enrollment, face_id: enrollment.face_id.toString()},
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

            if(!event) {
                return next(new NotFoundError("Event not found.", "event_id"));
            }

            res.send({...event, primary_image: Buffer.from(event.primary_image).toString('base64'), secondary_image: Buffer.from(event.secondary_image).toString('base64')});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }


}
