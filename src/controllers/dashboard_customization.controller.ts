import {NextFunction, Request, Response} from "express";
import DashboardCustomizationDAO from "../daos/dashboard_customization.dao";

export default class DashboardCustomizationController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const output = {};

            const data = await DashboardCustomizationDAO.getAll();

           for(const item of data) {
               // @ts-ignore
               output[item.key] = item.key === 'app_icon' ? Buffer.from(item.custom_file).toString('base64') : item.key === 'analytic' ? item.custom_json_array : item.custom_text;
           }

            res.send(output)
        } catch (err) {
            return next(err);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            const {app_name, app_icon, analytic} = req.body;

            if (app_name) {
                let appNameExists = await DashboardCustomizationDAO.getByKey('app_name');

                if (!appNameExists) {
                    await DashboardCustomizationDAO.insert({
                        key: 'app_name',
                        custom_text: app_name
                    })
                } else {
                    await DashboardCustomizationDAO.update('app_name', {
                        custom_text: app_name
                    })
                }
            }


            if (app_icon) {
                let appIconExists = await DashboardCustomizationDAO.getByKey('app_icon');

                const custom_file = Buffer.from(app_icon, 'base64');

                if (!appIconExists) {
                    await DashboardCustomizationDAO.insert({
                        key: 'app_icon',
                        custom_file
                    })
                } else {
                    await DashboardCustomizationDAO.update('app_icon', {
                        custom_file
                    })
                }
            }

            if (analytic) {
                let analyticExists = await DashboardCustomizationDAO.getByKey('analytic');

                if (!analyticExists) {
                    await DashboardCustomizationDAO.insert({
                        key: 'analytic',
                        custom_json_array: analytic
                    })
                } else {
                    await DashboardCustomizationDAO.update('analyticExists', {
                        custom_file: analytic
                    })
                }
            }

            res.send({success: true})
        } catch (err) {
            return next(err);
        }
    }
}
