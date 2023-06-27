// @ts-nocheck
import {NextFunction, Request, Response} from "express";
import VisitEventDAO from "../daos/visit_event.dao";
import {BadRequestError, NotFoundError} from "../utils/error.utils";
import EventDAO from "../daos/event.dao";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import moment from "moment";
import FaceImageDAO from "../daos/face_image.dao";

export default class EventController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        let {keyword, status, stream, page, limit, analytic, start_date, end_date} = req.query;

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
            let count = await EventDAO.getCountWithPagination(keyword, status, stream, analytic, startDate, endDate);

            // @ts-ignore
            let event = await EventDAO.getAllWithPagination(keyword, status, stream, analytic, startDate, endDate, parseInt(page), parseInt(limit));

            const visitData = await VisitEventDAO.getAll();
            // @ts-ignore
            res.send({
                total_page:  Math.floor(((parseInt(count[0].count) - 1) / limit) + 1),
                total_data: parseInt(count[0].count),
                data: event.map(item => {
                    // @ts-ignore
                    return {
                        ...item,
                        id: parseInt(item.id),
                        primary_image: Buffer.from(item.primary_image).toString('base64'),
                        secondary_image: Buffer.from(item.secondary_image).toString('base64'),
                        visitor_status: visitData.find(visit => visit.event_id === item.detection?.pipeline_data?.event_id)?.status
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
            const faceImages = await FaceImageDAO.getByEnrolledFaceIds([enrollment.id], false)

            res.send({
                enrollment: {...enrollment, face_id: enrollment.face_id.toString(), face_image_id: parseInt(faceImages[0].id)},
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

    static async getRecentFace(req: Request, res: Response, next: NextFunction) {
        try {
            const {mode, stream_id} = req.params;

            const events = await EventDAO.getRecentFace(mode, stream_id)

           res.send({data: events})
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
