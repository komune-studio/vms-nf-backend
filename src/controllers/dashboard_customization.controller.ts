import {NextFunction, Request, Response} from "express";
import DashboardCustomizationDAO from "../daos/dashboard_customization.dao";
import GlobalSettingDAO from "../daos/global_setting.dao";

export default class DashboardCustomizationController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            const output = {};

            const data = await DashboardCustomizationDAO.getAll();

           for(const item of data) {
               // @ts-ignore
               output[item.key] = item.key === 'app_icon' ? Buffer.from(item.custom_file).toString('base64') : item.key === 'app_name' ? item.custom_text : item.key === 'analytic' ? item.custom_json_array : item.custom_number;
           }

            let result = await GlobalSettingDAO.getAll();

           // @ts-ignore
            output.similarity =  result.length === 0 ? .7 : result[0].similarity;

            res.send(output)
        } catch (err) {
            return next(err);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        try {
            let {app_name, app_icon, icon_size, analytic, similarity} = req.body;

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
                    await DashboardCustomizationDAO.update('analytic', {
                        custom_json_array: analytic
                    })
                }
            }

            if (icon_size) {
                let iconSizeExists = await DashboardCustomizationDAO.getByKey('icon_size');

                if (!iconSizeExists) {
                    await DashboardCustomizationDAO.insert({
                        key: 'icon_size',
                        custom_number: icon_size
                    })
                } else {
                    await DashboardCustomizationDAO.update('icon_size', {
                        custom_number: icon_size
                    })
                }
            }

            if(similarity) {
                similarity = parseFloat(similarity);

                let result = await GlobalSettingDAO.getAll();

                if(result.length > 0) {
                    await GlobalSettingDAO.update(result[0].id, {similarity})
                } else {
                    await GlobalSettingDAO.create({similarity})
                }
            }

            res.send({success: true})
        } catch (err) {
            return next(err);
        }
    }
}
