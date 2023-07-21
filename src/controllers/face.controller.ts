import {NextFunction, Request, Response} from "express";
import request, {requestWithFile} from "../utils/api.utils";
import FormData from "form-data";
import fs from "fs";
import {BadRequestError, NotFoundError} from "../utils/error.utils";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import {BadRequestError} from "../utils/error.utils";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";

export default class FaceController {

    static async createFace(req: Request, res: Response, next: NextFunction) {
        const file = req.file;

        console.log(file)

        if (!req.body['name']) {
            return next(new BadRequestError("Name is required."));
        }

        if (!file) {
            return next(new BadRequestError("Image is required."));
        }

        try {
            const body = new FormData();
            Object.keys(req.body).forEach(key => {
                body.append(key, req.body[key]);
            });
            // @ts-ignore
            body.append('images', fs.createReadStream(file.path));
            // @ts-ignore
            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'POST', body);

            // @ts-ignore
            await EnrolledFaceDAO.updateAdditionalInfo(result.enrollment.id, JSON.parse(req.body.additional_info))
            console.log(result)

            res.send(result);
        } catch (e) {
            return next(e);
        } finally {
            fs.rmSync(file.path);
        }
    }

    static async getFace(req: Request, res: Response, next: NextFunction) {
        try {
            // @ts-ignore
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment?${new URLSearchParams(req.query)}`, 'GET');

            for(const enrollment of result.results.enrollments) {
                const additionalInfo = await EnrolledFaceDAO.getAdditionalInfo(enrollment.id)

                if(additionalInfo) {
                    enrollment.additional_info = additionalInfo.additional_info;
                }
            }


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
            const additionalInfo = await EnrolledFaceDAO.getAdditionalInfo(parseInt(id));

            if(result.enrollment && additionalInfo) {
                result.enrollment.additional_info = additionalInfo.additional_info;
            }

            console.log(result)

            res.send(result)
        } catch (e) {
            return next(e);
        }
    }

    static async updateFace(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;
        const {file} = req;

        if (!req.body['name']) {
            return next(new BadRequestError("Name is required."));
        }

        try {
            const body = new FormData();

            Object.keys(req.body).forEach(key => {
                body.append(key, req.body[key]);
            });


            if(file) {
                let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'GET');

                for(const face of result.enrollment.faces) {
                    body.append('deleted_variations', face.variation);
                }

                body.append('images', fs.createReadStream(file.path));
            }

            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'PUT', body);

            await EnrolledFaceDAO.updateAdditionalInfo(id, JSON.parse(req.body.additional_info))

            res.send(result);
        } catch (e) {
            return next(e);
        }  finally {
            if(file) {
                fs.rmSync(file.path);
            }
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

    static async getCaseDistribution(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await EnrolledFaceDAO.getCaseDistribution();
            // @ts-ignore
            res.send(result.map(item => ({...item, count: parseInt(item.count)})));
        } catch (e) {
            return next(e);
        }
    }
}
