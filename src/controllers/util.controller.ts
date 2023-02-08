import {NextFunction, Request, Response} from "express";
import EmployeeDAO from "../daos/employee.dao";
import LogsDao from "../daos/logs.dao";
import {format, getTime, formatDistanceToNow} from 'date-fns';

export default class UtilController {
    static async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
        try {
            const output = {total_employee: 0, total_clock_in: 0, total_clock_out: 0, daily_record: {}}

            let employee = await EmployeeDAO.getAllCount();
            output.total_employee = employee._count.id;

            let logs = await LogsDao.getAll(false);
            logs.forEach(data => {
                // @ts-ignore
                if (!output.daily_record[format(new Date(data.timestamp), 'dd MMM yyyy')]) {
                    // @ts-ignore
                    output.daily_record[format(new Date(data.timestamp), 'dd MMM yyyy')] = {total_clock_in: 0, total_clock_out: 0}
                }


                if (data.status) {
                    output.total_clock_in++;
                    // @ts-ignore
                    output.daily_record[format(new Date(data.timestamp), 'dd MMM yyyy')].total_clock_in++;
                } else {
                    output.total_clock_out++;
                    // @ts-ignore
                    output.daily_record[format(new Date(data.timestamp), 'dd MMM yyyy')].total_clock_out++;
                }
            })

            res.send(output);
        } catch (e) {
            return next(e);
        }
    }
}
