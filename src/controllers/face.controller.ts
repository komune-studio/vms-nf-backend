import {NextFunction, Request, Response} from "express";
import FormData from "form-data";
import fs from "fs";
import request, {requestWithFile} from "../utils/api.utils";
import {BadRequestError, ConflictError, NotFoundError} from "../utils/error.utils";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import FaceImageDAO from "../daos/face_image.dao";

export default class FaceController {

    static async createFace(req: Request, res: Response, next: NextFunction) {
        const file = req.file;
        if (!file) {
            return next(new BadRequestError("Image is required."));
        }

        if (!req.body['identity_number']) {
            return next(new BadRequestError("Identity number is required."));
        }

        if (!req.body['name']) {
            return next(new BadRequestError("Name is required."));
        }

        const enrollment = await EnrolledFaceDAO.getByIdentityNumber(req.body['identity_number'])

        if(enrollment) {
            return next(new ConflictError(`Face with identity number: ${req.body['identity_number']} has been registered.`));
        }

        try {
            const body = new FormData();
            Object.keys(req.body).forEach(key => {
                body.append(key, req.body[key]);
            });
            body.append('images', fs.createReadStream(file.path));
            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'POST', body);
            res.send(result);
        } catch (e) {
            return next(e);
        } finally {
            fs.rmSync(file.path);
        }
    }

    static async getFace(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment`, 'GET');
            console.log(result);
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async getFaceById(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            let result = await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'GET');
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async updateFace(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;
        const {file} = req;

        if (!req.body['identity_number']) {
            return next(new BadRequestError("Identity number is required."));
        }

        if (!req.body['name']) {
            return next(new BadRequestError("Name is required."));
        }

        const enrollment = await EnrolledFaceDAO.getByIdentityNumber(req.body['identity_number'])

        // @ts-ignore
        if(enrollment && parseInt(id) !== enrollment.id) {
            return next(new ConflictError(`Face with identity number: ${req.body['identity_number']} has been registered.`));
        }

        try {
            const body = new FormData();
            Object.keys(req.body).forEach(key => {
                body.append(key, req.body[key]);
            });
            if(file) {
                body.append('images', fs.createReadStream(file.path));
            }

            let result = await requestWithFile(`${process.env.NF_VANILLA_API_URL}/enrollment/${id}`, 'PUT', body);

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

    static async getByIdentityNumber(req: Request, res: Response, next: NextFunction) {
        const {identity_number} = req.params;

        const enrolledFace = await EnrolledFaceDAO.getByIdentityNumber(identity_number);

        if (enrolledFace === null) {
            return res.send({enrollment: null})
        }

        const faceImages = await FaceImageDAO.getByEnrolledFaceId(enrolledFace.id);

        // @ts-ignore
        const faces = [];

        faceImages.forEach(data => {
            faces.push(Buffer.from(data.image).toString('base64'))
        })

        // @ts-ignore
        res.send({enrollment: {...enrolledFace, faces, face_id: parseInt(enrolledFace.face_id)}})
    }

    static async reenroll(req: Request, res: Response, next: NextFunction) {
        const {identity_number} = req.body;

        const enrolledFace = await EnrolledFaceDAO.getByIdentityNumber(identity_number);

        if (enrolledFace === null) {
            return next(new NotFoundError("Enrollment not found.", "identity_number"));
        }

        const faceImages = await FaceImageDAO.getByEnrolledFaceId(enrolledFace.id);

        try {
            for(const data of faceImages) {
                await request(`${process.env.NF_FREMISN_API_URL}/face/enrollment`, 'POST', {image: Buffer.from(data.image).toString('base64'), keyspace: 'default', additional_params: {face_id: enrolledFace.face_id.toString()}});

                // @ts-ignore
                await FaceImageDAO.recover(data.id)
            }

            await EnrolledFaceDAO.recover(enrolledFace.id)

            res.send({success: true});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
