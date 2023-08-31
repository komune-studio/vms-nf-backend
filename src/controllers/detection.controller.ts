import {NextFunction, Request, Response} from "express";
import UserDAO from "../daos/user.dao";
import {BadRequestError, ConflictError, InvalidCredentialsError, UnauthorizedError} from "../utils/error.utils";
import DetectionDAO from "../daos/detection.dao";
import SecurityUtils from "../utils/security.utils";
import SiteDAO from "../daos/site.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import jwt from "jsonwebtoken";
import fs from "fs";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import FaceImageDAO from "../daos/face_image.dao";

export default class DetectionController {
    static async create(req: Request, res: Response, next: NextFunction) {

        try {
            // @ts-ignore
            await DetectionDAO.create({...req.body, image: Buffer.from(req.body.image, 'base64'), user_id: req.decoded.id});
            res.send({
                success: true
            })
        } catch (err) {
            console.log(err)

            return next(err);
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const {enrollment_id, case_id, search, user_id, start_date, end_date, id, page, limit} = req.query;

            // @ts-ignore
            const data = await DetectionDAO.getAll(enrollment_id, case_id, search, user_id, start_date, end_date, id, page, limit)

            let output = {data: data.map(item => ({...item, image: Buffer.from(item.image).toString('base64')}))};

            for (const idx in output.data) {
                const datum = output.data[idx]
                let associate = null;

                if(datum.associate_id) {
                   associate = await EnrolledFaceDAO.getById(datum.associate_id);


                   if(associate) {
                       const faceImage = await FaceImageDAO.getLatestImgThumbnail(associate.id)

                       // @ts-ignore
                       associate.face_id = associate.face_id.toString();
                       // @ts-ignore
                       associate.thumbnail = Buffer.from(faceImage.image_thumbnail).toString('base64');
                   }
                }

                const faceImage = await FaceImageDAO.getLatestImgThumbnail(datum.enrolled_face.id)

                if(faceImage) {
                    // @ts-ignore
                    output.data[idx] = {...datum, enrolled_face: {...datum.enrolled_face, thumbnail: Buffer.from(faceImage.image_thumbnail).toString('base64')}, associate}
                }
            }

            if(page !== undefined && limit !== undefined) {
                // @ts-ignore
               const detectionCount = await DetectionDAO.getCount(enrollment_id, case_id, search, user_id, start_date, end_date, id)

                // @ts-ignore
                output.total_data = detectionCount._count.id
            }

            res.send(output)
        } catch (err) {
            console.log(err)

            return next(err);
        }
    }

    static async getTopAssociate(req: Request, res: Response, next: NextFunction) {
        try {
            const {enrollment_id} = req.params;

            const data = await DetectionDAO.getTopAssociates(enrollment_id)

            if(data.length > 0 && data[0].associate_id) {
                const enrolledFace = await EnrolledFaceDAO.getById(data[0].associate_id);
                const faceImage = await FaceImageDAO.getLatestImgThumbnail(data[0].associate_id)

                if(enrolledFace && faceImage) {
                    // @ts-ignore
                    const thumbnail = Buffer.from(faceImage.image_thumbnail).toString('base64')

                    // @ts-ignore
                    return res.send([
                        {
                            count: data[0]._count.associate_id,
                            enrolled_face: thumbnail,
                            full_name: enrolledFace.name,
                            nik: enrolledFace.identity_number
                        }
                    ])
                }
            }

            res.send([])
        } catch (err) {
            console.log(err)

            return next(err);
        }
    }

    static async getTopTarget(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await DetectionDAO.getTopTarget()
            const output = [];

            for(const datum of data) {
                const enrolledFace = await EnrolledFaceDAO.getById(datum.enrollment_id);
                const faceImage = await FaceImageDAO.getLatestImgThumbnail(datum.enrollment_id)

                if(enrolledFace && faceImage) {
                    // @ts-ignore
                    const thumbnail = Buffer.from(faceImage.image_thumbnail).toString('base64')

                    output.push(
                        {
                            count: datum._count.enrollment_id,
                            enrolled_face: thumbnail,
                            full_name: enrolledFace.name,
                            nik: enrolledFace.identity_number
                        }
                    )
                }
            }

            res.send(output)
        } catch (err) {
            console.log(err)

            return next(err);
        }
    }

    static async getDetectionDistribution(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await DetectionDAO.getDetectionDistribution()

            // @ts-ignore
            res.send(data.map(item => ({...item, count: parseInt(item.count)})))
        } catch (err) {
            console.log(err)

            return next(err);
        }
    }

    static async getTop3(req: Request, res: Response, next: NextFunction) {
        try {
            const data = await DetectionDAO.getTop3()

            // @ts-ignore
            res.send(data.map(item => ({...item, count: parseInt(item.count)})))
        } catch (err) {
            console.log(err)

            return next(err);
        }
    }
}
