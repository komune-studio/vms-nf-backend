import cors from "cors";
import * as dotenv from "dotenv";
import express, {NextFunction, Request, Response} from "express";
import logger from "morgan";
import AuthController from "./controllers/auth.controller";
import EmployeeDAO from "./daos/employee.dao";
import LocationDAO from "./daos/location.dao";
import VisitEventDAO from "./daos/visit_event.dao";
import VisitationDAO from "./daos/visitation.dao";
import EnrolledFaceDAO from "./daos/enrolled_face.dao";

import handleErrors from "./middlewares/error.middleware";

import v1 from "./routes/v1/routes";
import PrismaService from "./services/prisma.service";
import WebsocketService from "./services/websocket.service";
import {NotFoundError} from "./utils/error.utils";
import CustomizedFormDao from "./daos/customized_form.dao";
import BookingDAO from "./daos/booking.dao";

// const schedule = require('node-schedule');

/**
 * checking expired enrollment every midnight
 */
// schedule.scheduleJob('0 0 * * *', async function(){
//     try {
//         console.log(`Checking expired enrollment...`)
//
//         const expiredIds = await EnrolledFaceDAO.getExpiredFaceId();
//
//         // @ts-ignore
//         if(expiredIds.length === 0) {
//             console.log(`There is currently no expired enrollment.`)
//         }
//
//         // @ts-ignore
//         for(const data of expiredIds) {
//             console.log(`Deleting expired enrollment with face id: ${data.id}`)
//
//             try {
//                 await request(`${process.env.NF_VANILLA_API_URL}/enrollment/${data.id}`, 'DELETE');
//
//                 console.log(`Enrollment with face id: ${data.id} deleted!`)
//             } catch (e) {
//                 console.log(`Enrollment with face id: ${data.id} delete error:`)
//                 console.log(e)
//             }
//         }
//     } catch (e) {
//         console.log(e)
//     }
// });

dotenv.config();

const app = express();

const PORT = process.env.SERVER_PORT || 3000;

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true}));
app.use(logger("dev"));
app.use(cors());

app.get('/', (req: Request, res: Response) => {
    res.send({message: "Hello there!"});
});

app.use('/v1', v1)

app.use('*', (req: Request, res: Response, next : NextFunction) => {
    return next(new NotFoundError("Endpoint does not exist."))
})

app.use(handleErrors);

(async () => {
    await PrismaService.initialize();

    try {
        await AuthController.initialize();
        await EmployeeDAO.createTable();
        console.log("Employee table initialized successfully.");

        await LocationDAO.createTable();
        console.log("Location table initialized successfully.");

        await VisitationDAO.createTable();
        console.log("Visitation table initialized successfully.");

        await VisitEventDAO.createTable();
        console.log("Visit Event table initialized successfully.");

        await CustomizedFormDao.createTable();
        console.log("Customized Form table initialized successfully.");

        await BookingDAO.createTable()
        console.log("Booking table initialized successfully.");

        await EnrolledFaceDAO.addAdditionalInfoColumn()
        console.log("Additional info column has been added to Enrolled Face table.");
    } catch (e) {
        console.log(e);
        return;
    }

    const server = app.listen(PORT, async () => {
        console.log(`Server listening on port ${PORT}!`);
    });

    await WebsocketService.initialize(server);
})();
