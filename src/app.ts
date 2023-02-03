import * as dotenv from "dotenv";
import express, {Request, Response} from "express";
import logger from "morgan";
import v1 from "./routes/v1/routes";
import Nodeflux from "./utils/nodeflux.utils";
import EmployeeDAO from "./daos/employee.dao";

dotenv.config();

const app = express();

const PORT = process.env.SERVER_PORT || 3000;

app.use(express.json({limit: '50mb'}));
app.use(express.urlencoded({extended: true}));
app.use(logger("dev"));

app.get('/', (req: Request, res: Response) => {
    res.send({message: "Hello there!"});
});

app.use('/v1', v1)

app.use('*', (req: Request, res: Response) => {

})

app.listen(PORT, async () => {
    Nodeflux.createKeyspace();

    console.log(`Server listening on port ${PORT}!`);
});
