import {NextFunction, Request, Response} from "express";
import RecognizedEventDAO from "../daos/recognized_event.dao";
import FremisnDAO from "../daos/fremisn.dao";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";

export default class RecognizedEventController {
    static async get(req : Request, res : Response, next : NextFunction) {
        const { image, limit } = req.body;

        try {
           const response = await FremisnDAO.faceRecognition('recognized', image, parseInt(limit));

            const {candidates} = response.result.face_recognition;

            if(candidates.length === 0) return res.send([])

            // @ts-ignore
            const recognizedEvents = await RecognizedEventDAO.getByFaceIds(candidates.map(data => BigInt(data.face_id)))

            // @ts-ignore
            const enrolledFaces = await EnrolledFaceDAO.getByIds(recognizedEvents.map(data => parseInt(data.enrollment_id)))

            // @ts-ignore
            res.send(candidates.map(candidate => {
                let event = {};

                // @ts-ignore
                recognizedEvents.forEach(data => {
                    if(data.face_id === BigInt(candidate.face_id)) {
                        enrolledFaces.forEach(face => {
                            // @ts-ignore
                            if(face.id === parseInt(data.enrollment_id)) {
                                event = {...data, name: face.name};
                            }
                        })

                    }
                })


                // @ts-ignore
                return {...event, id: event.id.toString(), face_id: event.face_id.toString(), timestamp: parseInt(event.timestamp), enrollment_id: parseInt(event.enrollment_id), image: Buffer.from(event.image).toString('base64'), similarity: candidate.similarity}
            }))
        } catch (err) {
            return next(err);
        }
    }
}
