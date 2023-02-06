import * as dotenv from "dotenv";
import express, {NextFunction, Request, Response} from "express";
import logger from "morgan";
import cors from "cors";

import v1 from "./routes/v1/routes";

import handleErrors from "./middlewares/error.middleware";
import PrismaService from "./services/prisma.service";
import Nodeflux from "./utils/nodeflux.utils";
import {NotFoundError} from "./utils/error.utils";

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
    await Nodeflux.createKeyspace();

    app.listen(PORT, () => {
        console.log(`Server listening on port ${PORT}!`);
    });
})();
