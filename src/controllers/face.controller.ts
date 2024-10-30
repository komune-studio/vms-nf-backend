// @ts-nocheck
import {NextFunction, Request, Response} from "express";
import request, {requestWithFile} from "../utils/api.utils";
import FormData from "form-data";
import fs from "fs";
import {BadRequestError, NotFoundError} from "../utils/error.utils";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import FremisnDAO from "../daos/fremisn.dao";
import RecognizedEventDAO from "../daos/recognized_event.dao";
import FaceImageDAO from "../daos/face_image.dao";
import SiteDAO from "../daos/site.dao";
import moment from "moment/moment";
import EventDAO from "../daos/event.dao";

export default class FaceController {

    static async createFace(req: Request, res: Response, next: NextFunction) {
        const files = req.files;

        if (!req.body['name']) {
            return next(new BadRequestError("Name is required."));
        }

        if (Array.isArray(files) && files.length === 0) {
            return next(new BadRequestError("Image is required."));
        }

        try {
            const body = new FormData();
            Object.keys(req.body).forEach(key => {
                body.append(key, req.body[key]);
            });

            // @ts-ignore
            files.forEach(file => {
                body.append('images', fs.createReadStream(file.path));
            })

            // @ts-ignore
            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'POST', body);

            if(req.body.additional_info) {
                // @ts-ignore
                await EnrolledFaceDAO.updateAdditionalInfo(result.enrollment.id, req.body.additional_info);
            }

            res.send(result);
        } catch (e) {
            console.log(e)

            return next(e);
        } finally {
            // @ts-ignore
            files.forEach(file => {
                fs.rmSync(file.path);
            })

        }
    }

    static async getFace(req: Request, res: Response, next: NextFunction) {
        try {
            // @ts-ignore
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment?${new URLSearchParams(req.query)}`, 'GET');

            for(const enrollment of result.results.enrollments) {
                const response = await EnrolledFaceDAO.getFaceIdByEnrolledFaceId(enrollment.id);

                if(response) {
                    enrollment.face_id = response.face_id.toString()
                }
            }

            console.log(result.results.enrollments)

            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async getFaceById(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'GET');

            let response = await EnrolledFaceDAO.getAdditionaInfo(result.enrollment.id);

            // @ts-ignore
            result.enrollment.additional_info = response.additional_info;

            res.send(result)
        } catch (e) {
            return next(e);
        }
    }

    static async updateFace(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;
        const files = req.files;

        if (!req.body['name']) {
            return next(new BadRequestError("Name is required."));
        }

        try {
            const body = new FormData();

            Object.keys(req.body).forEach(key => {
                if(Array.isArray(req.body[key])) {
                    console.log(req.body[key])

                    for (let i = 0; i < req.body[key].length; i++) {
                        body.append(`${key}`, req.body[key][i]);
                    }
                } else {
                    body.append(key, req.body[key]);
                }
            });
            // @ts-ignore
            files.forEach(file => {
                body.append('images', fs.createReadStream(file.path));
            })

            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'PUT', body);

            if(req.body.additional_info) {
                await EnrolledFaceDAO.updateAdditionalInfo(parseInt(id), req.body.additional_info);
            }

            res.send(result);
        } catch (e) {
            console.log(e)

            return next(e);
        }  finally {
            // @ts-ignore
            files.forEach(file => {
                try {
                    fs.rmSync(file.path);
                } catch (e) {
                    console.log(e)
                }
            })
        }
    }

    static async deleteFace(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'DELETE');
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async getFaceExcludeDssIds(req: Request, res: Response, next: NextFunction) {
        const {ids} = req.query;

        try {
           const response = await EnrolledFaceDAO.getFaceExcludeDssIds(ids?.toString())

           res.send({data: response.map(e => parseInt(e.id))});
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }

    static async deleteByDssId(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            const enrollment = await EnrolledFaceDAO.getFaceByDssId(id)

            if(enrollment.length === 0) {
                return next(new NotFoundError("Enrollment not found.", "id"));
            }

            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${parseInt(enrollment[0].id)}`, 'DELETE');
            res.send(result);
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }

    static async faceRecognition(req : Request, res : Response, next : NextFunction) {
        const { image, limit } = req.body;

        try {
            const response = await FremisnDAO.faceRecognition('default', image, parseInt(limit));

            const {candidates} = response.result.face_recognition;

            if(candidates.length === 0) return res.send([])

            for(const candidate of candidates) {
                const enrollment = await EnrolledFaceDAO.getByFaceId(candidate.face_id)

                if(enrollment) {
                    const faceImage = await FaceImageDAO.getThumbnailByEnrolledFaceIds([parseInt(enrollment.id)])

                    enrollment.image_thumbnail = Buffer(faceImage[0].image_thumbnail).toString('base64')

                    if(candidate.face_id === enrollment.face_id.toString()) {
                        candidate.enrollment = {...enrollment, face_id: enrollment.face_id.toString()}
                    }
                }
            }

            res.send(candidates)
        } catch (err) {
            try {
                const error = await err.json()

                return res.status(error.code).send(error)
            } catch (e) {
                return next(err);
            }
        }
    }

    static async getFacesByDssIds(req: Request, res: Response, next: NextFunction) {
        const {ids} = req.query;

        try {
            let response = await EnrolledFaceDAO.getFacesByDssIds(ids?.toString())

            let sites = await SiteDAO.getAll();

            for(const idx in response) {
                let siteAccess = [];

                if(response[idx].additional_info.site_access) {
                    for(const access of response[idx].additional_info.site_access) {
                        for(const site of sites) {
                            if(site.id === access) {
                                console.log(site)

                                siteAccess.push(site)
                            }
                        }
                    }
                }
                response[idx].id = parseInt(response[idx].id)
                response[idx].face_id = response[idx].face_id.toString();
                response[idx].additional_info.site_access = siteAccess
            }

            res.send({data: response});
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }

    static async getAllFaces(req: Request, res: Response, next: NextFunction) {
        let {keyword, status, page, limit, start_date, end_date} = req.query;

        console.log(start_date)


        try {
            const startDate = start_date ? moment(new Date(start_date)).format('YYYY-MM-DDTHH:mm:00Z') : null;
            const endDate = end_date ? moment(new Date(end_date)).format('YYYY-MM-DDTHH:mm:00Z') : null;

            // @ts-ignore
            let data = await EnrolledFaceDAO.getAllWithPagination(keyword, status, startDate, endDate, parseInt(page), parseInt(limit));

            // @ts-ignore
            let count = await EnrolledFaceDAO.getCountWithPagination(keyword, status, startDate, endDate);

            const faceImages = await FaceImageDAO.getThumbnailByEnrolledFaceIds(data.map(item => parseInt(item.id)))

            for(const idx in data) {
                for(const image of faceImages) {
                    if(parseInt(data[idx].id) === parseInt(image.enrolled_face_id)) {
                        data[idx].id = data[idx].id.toString()
                        data[idx].face_id = data[idx].face_id.toString()

                        data[idx].image_thumbnail = Buffer.from(image.image_thumbnail).toString('base64')
                    }
                }
            }

            // @ts-ignore
            res.send({
                total_page:  Math.floor(((parseInt(count[0].count) - 1) / limit) + 1),
                total_data: parseInt(count[0].count),
                data
            });
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }
}
