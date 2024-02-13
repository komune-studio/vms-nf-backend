import {NextFunction, Request, Response} from "express";
import FaceImageDAO from "../daos/face_image.dao";

export default class FaceImageController {
    static async getFullSizeFaceImage(req: Request, res: Response, next: NextFunction) {
        const {id} = req.params;

        try {
            let result = await FaceImageDAO.getFullSizeById(parseInt(id))
            res.send({image: result ? Buffer.from(result.image).toString('base64') : null});
        } catch (e) {
            return next(e);
        }
    }
}
