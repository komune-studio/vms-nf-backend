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

            // const response = {
            //     "job": {
            //         "id": "20221020043031051e70403920ef4166736e95205fdc6c8f2b6f6dd4b5d7bc4efd78606ef5ab20bca",
            //         "result": {
            //             "analytic_type": "LICENSE_PLATE_RECOGNITION",
            //             "result": [
            //                 {
            //                     "license_plate_recognition": [
            //                         {
            //                             "bounding_box": {
            //                                 "height": 0.07172417640686035,
            //                                 "left": 0.21474507451057434,
            //                                 "top": 0.6687697172164917,
            //                                 "width": 0.10315108299255371
            //                             },
            //                             "confidence": 0.8935918807983398,
            //                             "label": "D1336TD"
            //                         },
            //                         {
            //                             "bounding_box": {
            //                                 "height": 0.06129580736160278,
            //                                 "left": 0.6659622192382813,
            //                                 "top": 0.5559597015380859,
            //                                 "width": 0.0974544882774353
            //                             },
            //                             "confidence": 0.9186372756958008,
            //                             "label": "2828XM"
            //                         }
            //                     ]
            //                 }
            //             ],
            //             "status": "success"
            //         }
            //     },
            //     "message": "License Plate Recognition Success",
            //     "ok": true
            // }

            const result = {}

            if(response.job?.result?.result[0]?.license_plate_recognition?.length > 0) {
                const faces = await EnrolledFaceDAO.getFacesByPlate(response.job.result.result[0].license_plate_recognition[0].label);
                console.log(faces)

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
            try {
                const error = await err.json()

                return res.status(error.code).send(error)
            } catch (e) {
                return next(err);
            }
        }
    }
}