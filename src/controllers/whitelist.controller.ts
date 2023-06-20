import {NextFunction, Request, Response} from "express";
import FormData from "form-data";
import fs from "fs";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import request, {requestWithFile} from "../utils/api.utils";
import {BadRequestError, NotFoundError} from "../utils/error.utils";
import FaceImageDAO from "../daos/face_image.dao";

export default class BlacklistController {
    static async createWhitelisted(req: Request, res: Response, next: NextFunction) {
        const file = req.file;
        if (!file) {
            return next(new BadRequestError("Image is required."));
        }

        try {
            const body = new FormData();
            Object.keys(req.body).forEach(key => {
                if (key !== "status")
                    body.append(key, req.body[key]);
            });
            body.append('status', "WHITELIST");
            body.append('images', fs.createReadStream(file.path));
            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'POST', body);
            res.send(result);
        } catch (e) {
            return next(e);
        } finally {
            fs.rmSync(file.path);
        }
    }

    static async getAllWhitelisted(req: Request, res: Response, next: NextFunction) {
        try {
            // @ts-ignore
            let result = await EnrolledFaceDAO.getAll(null, null, '', 'WHITELIST')

            const faceImages = await FaceImageDAO.getByEnrolledFaceIds(result.map(row => row.id), true)

            result.forEach((row, idx) => {
                // @ts-ignore
                result[idx].faces = [];

                faceImages.forEach(data => {
                    console.log(BigInt(row.id))
                    console.log(data.enrolled_face_id)

                    // @ts-ignore
                    if(data.enrolled_face_id === BigInt(row.id)) {
                        const imageThumbnail = data.image_thumbnail ? {image_thumbnail: Buffer.from(data.image_thumbnail).toString('base64')} : {}

                        // @ts-ignore
                        result[idx].faces.push({...data, id: data.id.toString(), enrolled_face_id: data.enrolled_face_id.toString(), ...imageThumbnail})
                    }
                })
            })
            // console.log(result1)

            // let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'GET');

            // result = result.results.enrollments.filter((item: any) => item.status === "BLACKLIST");
            res.send(result.map(data => ({...data, face_id: data.face_id.toString()})));
        } catch (e) {
            return next(e);
        }
    }

    static async getWhitelistedById(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'GET');

            if (result.enrollment.status !== "WHITELIST") {
                return next(new NotFoundError("Face not found"));
            }
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async updateWhitelisted(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            const body = new FormData();
            Object.keys(req.body).forEach(key => {
                if (key !== "status")
                    body.append(key, req.body[key]);
            });
            body.append('status', "WHITELIST");
            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'PUT', body);
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async deletWhitelisted(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            let face = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'GET');
            if (face.enrollment.status !== "WHITELIST") {
                return next(new NotFoundError("Face not found"));
            }

            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'DELETE');
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }
}
