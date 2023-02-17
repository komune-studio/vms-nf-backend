// @ts-nocheck
import {NextFunction, Request, Response} from "express";
import {BadRequestError} from "../utils/error.utils";
import EventDAO from "../daos/event.dao";

export default class EventController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        const {keyword, status, page, limit} = req.query;

        if (!page || !limit) {
            return next(new BadRequestError({
                page: !page ? "Page is not defined." : undefined,
                limit: !limit ? "Limit is not defined." : undefined,
            }))
        }

        try {
            // @ts-ignore
            let count = await EventDAO.getCountWithPagination(keyword, status);

            // @ts-ignore
            let event = await EventDAO.getAllWithPagination(keyword, status, parseInt(page), parseInt(limit));

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
                        secondary_image: Buffer.from(item.secondary_image).toString('base64')
                    }
                })
            });
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
