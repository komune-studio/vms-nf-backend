import {NextFunction, Request, Response} from "express";
import UnrecognizedEventDAO from "../daos/unrecognized_event.dao";
import FremisnDAO from "../daos/fremisn.dao";
import EnrolledFaceDAO from "../daos/enrolled_face.dao";

export default class UnrecognizedEventController {
    static async get(req : Request, res : Response, next : NextFunction) {
        const { image, limit } = req.body;

        try {
            const response = await FremisnDAO.faceRecognition('unrecognized', image, parseInt(limit));

            const {candidates} = response.result.face_recognition;

            if(candidates.length === 0) return res.send([])

            // @ts-ignore
            const unrecognizedEvents = await UnrecognizedEventDAO.getByFaceIds(candidates.map(data => BigInt(data.face_id)))

            // @ts-ignore
            res.send(candidates.map(candidate => {
                let event = {};

                unrecognizedEvents.forEach(data => {
                    if(data.face_id === BigInt(candidate.face_id)) {
                        event = data;
                    }
                })

                // @ts-ignore
                return {...event, id: event.id.toString(), face_id: event.face_id.toString(), timestamp: parseInt(event.timestamp), image: Buffer.from(event.image).toString('base64'), similarity: candidate.similarity}
            }))
        } catch (err) {
            return next(err);
        }
    }
}
