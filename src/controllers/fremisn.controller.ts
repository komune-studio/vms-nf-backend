import {NextFunction, Request, Response} from "express";
import request from "../utils/api.utils";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import FaceImageDAO from "../daos/face_image.dao";

export default class FremisnController {
    static async faceSearch(req: Request, res: Response, next: NextFunction) {
        try {
            // @ts-ignore
            let response = await request(`${process.env.NF_FREMISN_API_URL}/face/recognition`, 'POST', {
                ...req.body,
                keyspace: 'default'
            });

            const {candidates} = response.result.face_recognition

            console.log(candidates)

            const faceIds = [];

            for(const candidate of candidates) {
                faceIds.push(BigInt(candidate.face_id))
            }

            const enrolledFaces = await EnrolledFaceDAO.getByFaceIds(faceIds)

            const faceImages = await FaceImageDAO.getByEnrolledFaceIds(enrolledFaces.map(face => face.id))

            for(const candidate of candidates) {
                enrolledFaces.forEach(enrolledFace => {
                    if(candidate.face_id === enrolledFace.face_id.toString()) {
                        candidate.additional_info = {...enrolledFace, face_id: enrolledFace.face_id.toString()};

                        faceImages.forEach(faceImage => {
                            console.log(faceImage.enrolled_face_id)
                            console.log(enrolledFace.id)

                            if(faceImage.enrolled_face_id === enrolledFace.id) {
                                // @ts-ignore
                                candidate.additional_info.enrolled_face = Buffer.from(faceImage.image_thumbnail).toString('base64')
                            }
                        })
                    }
                })
            }

            // @ts-ignore
            // console.log(faceImages.map(data => Buffer.from(data.image_thumbnail).toString('base64')))

            // console.log(faceImages.map(faceImage => Buffer.from(faceImage.image_thumbnail).toString('base64')))

            res.send(candidates);
        } catch (e) {
            console.log(e)
            return next(e);
        }
    }
}
