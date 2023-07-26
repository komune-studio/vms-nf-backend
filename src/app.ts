import cors from "cors";
import * as dotenv from "dotenv";
import express, {NextFunction, Request, Response} from "express";
import logger from "morgan";
import AuthController from "./controllers/auth.controller";

import handleErrors from "./middlewares/error.middleware";

import v1 from "./routes/v1/routes";
import PrismaService from "./services/prisma.service";
import {NotFoundError} from "./utils/error.utils";
import FremisnDAO from "./daos/fremisn.dao";

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
        console.log('Creating keyspace: recognized')
        await FremisnDAO.createKeyspace('recognized');
        console.log('Keyspace created: recognized')

        console.log('Creating keyspace: unrecognized')
        await FremisnDAO.createKeyspace('unrecognized');
        console.log('Keyspace created: unrecognized')
    } catch (e) {
        console.log(e);
        return;
    }

    app.listen(PORT, async () => {
        console.log(`Server listening on port ${PORT}!`);
    });
})();
