import {NextFunction, Request, Response as Res} from "express";
import LogsDao from "../daos/logs.dao";
import EmployeeDAO from "../daos/employee.dao";
import moment from "moment";
import Nodeflux from "../utils/nodeflux.utils";

export default class LogsController {
    static async create(req: Request, res: Res, next: NextFunction) {
        try {
            const faceRecognition = await Nodeflux.executeFaceRecognition(req.body.image)
            const threshold = process.env.NODEFLUX_THRESHOLD ? process.env.NODEFLUX_THRESHOLD : .9
            let employeeId;

            if (faceRecognition.result.face_recognition.candidates.length === 0 || faceRecognition.result.face_recognition.candidates[0].similarity < threshold) {
                return res.status(404).send({
                    error: "Unrecognized face!"
                })
            } else {
                employeeId = parseInt(faceRecognition.result.face_recognition.candidates[0].face_id)
            }


            /**
             * Determine if it's clock in / out based on current time
             */
            const status = parseInt(moment().format('H')) < 17 ? 1 : 0

            let latestLog = await LogsDao.getLatestByEmployeeId(employeeId);

            if (status === 1) {
                /**
                 * handle clock in
                 */

                if (!latestLog || moment(latestLog.timestamp).format('YYYY-MM-DD') !== moment().format('YYYY-MM-DD')) {
                    /**
                     * check if employee has not clocked in today (either no latest log or latest log date is not same as current date)
                     */
                    const currentDate = new Date();

                    await LogsDao.create({
                        employee_id: employeeId,
                        status,
                        timestamp: currentDate
                    })

                    const employee = await EmployeeDAO.getById(employeeId)

                    if (employee) {
                        // @ts-ignore
                        employee.ktp_image = Buffer.from(employee.ktp_image).toString('base64')
                        // @ts-ignore
                        employee.face_image = Buffer.from(employee.face_image).toString('base64')
                    }

                    return res.send({
                        employee,
                        clock_in_time: currentDate
                    })
                } else {
                    /**
                     * gives error that user has clocked in
                     */

                    return res.status(400).send({
                        error: "You have clocked in!"
                    })
                }

            } else {
                /**
                 * handle clock out
                 */

                if (latestLog && moment(latestLog.timestamp).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD')) {
                    /**
                     * check if employee has latest log
                     */

                    if (latestLog.status === 0) {
                        /**
                         * Handle if employee wants to clocked out when they already clocked out
                         */
                        return res.status(400).send({
                            error: "You have clocked out!"
                        })
                    }

                    const currentDate = new Date();

                    await LogsDao.create({
                        employee_id: employeeId,
                        status,
                        timestamp: currentDate
                    })

                    const employee = await EmployeeDAO.getById(employeeId)

                    if (employee) {
                        // @ts-ignore
                        employee.ktp_image = Buffer.from(employee.ktp_image).toString('base64')
                        // @ts-ignore
                        employee.face_image = Buffer.from(employee.face_image).toString('base64')
                    }

                    return res.send({
                        employee,
                        clock_in_time: latestLog.timestamp,
                        clock_out_time: currentDate
                    })
                } else {
                    /**
                     * gives error that user has not clocked in
                     */

                    return res.status(400).send({
                        error: "You have not clocked in!"
                    })
                }
            }
        } catch (e) {
            if (e instanceof Response) {
                const error = await e.json();

                console.log(error)

                return res.status(500).send(
                    {
                        ...error,
                        error: error.description ? error.description : "Internal server error"
                    })
            }
        }
    }
}
