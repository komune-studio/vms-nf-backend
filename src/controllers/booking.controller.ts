// @ts-nocheck
import {NextFunction, Request, Response} from "express";
import VisitEventDAO from "../daos/visit_event.dao";
import {BadRequestError, ConflictError, NotFoundError} from "../utils/error.utils";
import BookingDAO from "../daos/booking.dao";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import moment from "moment";
import AdminDAO from "../daos/admin.dao";
import SecurityUtils from "../utils/security.utils";
import fs from "fs";

export default class BookingController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        let {id, page, limit, history} = req.query;

        if (!page || !limit) {
            return next(new BadRequestError({
                page: !page ? "Page is not defined." : undefined,
                limit: !limit ? "Limit is not defined." : undefined,
            }))
        }

        try {
            history = history === 'true'

            // @ts-ignore
            let count = await BookingDAO.getCount(id, history);

            // @ts-ignore
            let data = await BookingDAO.getAll(id, parseInt(page), parseInt(limit), history);

            console.log(data)

            // @ts-ignore
            res.send({
                total_page:  Math.floor(((parseInt(count[0].count) - 1) / limit) + 1),
                total_data: parseInt(count[0].count),
                data: data.map(item => {
                    // @ts-ignore
                    return {
                        ...item,
                        id: parseInt(item.id),
                        image: Buffer.from(item.image).toString('base64')
                    }
                })
            });
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await BookingDAO.getById(parseInt(req.params.id));

            console.log(result)

            // @ts-ignore
            res.send(result ? {...result, id: parseInt(result.id), image:  Buffer.from(result.image).toString('base64')} : {});
        } catch (e) {
            console.error(e)

            return next(e);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        const file = req.file;
        if (!file) {
            return next(new BadRequestError("Image is required."));
        }


        try {
            const response = await BookingDAO.create({...req.body, image: fs.readFileSync(file.path), employee_id: req.body.employee_id ? parseInt(req.body.employee_id) : null, birth_date:  req.body.birth_date ? new Date(req.body.birth_date) : null});

            res.send({success: true, id: response.id.toString()});
        } catch (e) {
            console.log(e)

            return next(e);
        }  finally {
            fs.rmSync(file.path);
        }
    }

    static async inactivate(req: Request, res: Response, next: NextFunction) {
        try {
            await BookingDAO.inactivate(parseInt(req.params.id));

            res.send({success: true});
        } catch (e) {
            console.error(e)

            return next(e);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        let id = parseInt(req.params.id);

        try {
            let booking = await BookingDAO.getById(id);

            if (booking === null) {
                return next(new NotFoundError("Booking not found.", "id"));
            }

            await BookingDAO.delete(id);

            res.send({success: true});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
