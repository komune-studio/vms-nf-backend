import {NextFunction, Request, Response} from "express";
import GlobalSettingDAO from "../daos/global_setting.dao";

export default class GlobalSettingController {
    static async get(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await GlobalSettingDAO.getAll();
            res.send({similarity: result.length === 0 ? .7 : result[0].similarity});
        } catch (e) {
            return next(e);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await GlobalSettingDAO.getAll();
            let {similarity} = req.body;
            similarity = parseFloat(similarity);

            if(result.length > 0) {
                await GlobalSettingDAO.update(result[0].id, {similarity})
            } else {
                await GlobalSettingDAO.create({similarity})
            }

            // @ts-ignore
            res.send({success: true});
        } catch (e) {
            console.error(e)

            return next(e);
        }
    }
}
