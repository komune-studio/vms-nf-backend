// @ts-nocheck

import {NextFunction, Request, Response} from "express";
import LprDAO from "../daos/lpr.dao";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";
import FaceImageDAO from "../daos/face_image.dao";

export default class LprController {
    static async licensePlateRecognition(req : Request, res : Response, next : NextFunction) {
        const { image } = req.body;

        try {
            const response = await LprDAO.licensePlateRecognition(image);

            const result = {}

            if(response.job?.result?.result[0]?.license_plate_recognition?.length > 0) {
                const faces = await EnrolledFaceDAO.getFacesByPlate(response.job.result.result[0].license_plate_recognition[0].label);
                let enrollment = null

                if(faces.length > 0) enrollment = {...faces[0], id: faces[0].id.toString(), face_id: faces[0].face_id.toString()};

                result.enrollment = enrollment;
                result.label = response.job.result.result[0].license_plate_recognition[0].label
                result.confidence = response.job.result.result[0].license_plate_recognition[0].confidence
                result.similar_plate = await EnrolledFaceDAO.getFacesByPlateSimilar(response.job.result.result[0].license_plate_recognition[0].label)

                for(const idx in result.similar_plate) {
                    result.similar_plate[idx] = {...result.similar_plate[idx], id: result.similar_plate[idx].id.toString(), face_id: result.similar_plate[idx].face_id.toString()}
                }
            }



            res.send({result})
        } catch (err) {
            console.log('isi errornya', err)
            try {
                const error = await err.json()

                return res.status(error.code).send(error)
            } catch (e) {
                return next(err);
            }
        }
    }
}