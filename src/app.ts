import cors from "cors";
import * as dotenv from "dotenv";
import express, {NextFunction, Request, Response} from "express";
import logger from "morgan";
import AuthController from "./controllers/auth.controller";

import handleErrors from "./middlewares/error.middleware";

import v1 from "./routes/v1/routes";
import PrismaService from "./services/prisma.service";
import EnrolledFaceDAO from "./daos/enrolled_face.dao";
import {NotFoundError} from "./utils/error.utils";
import request from "./utils/api.utils";
const schedule = require('node-schedule');

/**
 * todo: tentuin interval checking nya
 */
// schedule.scheduleJob('* * * * *', async function(){
//     try {
//         console.log(`Checking expired enrollment...`)
//
//         /**
//          * todo: add whitelist condition
//          */
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
    } catch (e) {
        console.log(e);
        return;
    }

    app.listen(PORT, async () => {
        console.log(`Server listening on port ${PORT}!`);
    });
})();
