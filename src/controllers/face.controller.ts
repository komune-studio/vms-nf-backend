import {NextFunction, Request, Response} from "express";
import request, {requestWithFile} from "../utils/api.utils";
import FormData from "form-data";
import fs from "fs";
import {BadRequestError} from "../utils/error.utils";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";

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
            res.send(result);
        } catch (e) {
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
}
