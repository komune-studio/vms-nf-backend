import * as dotenv from "dotenv";
import express, {Request, Response} from "express";
import logger from "morgan";
import v1 from "./routes/v1/routes";

dotenv.config();

const app = express();

const PORT = process.env.SERVER_PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(logger("dev"));

app.get('/', (req : Request, res : Response) => {
    res.send({message: "Hello there!"});
});

app.use('/v1', v1)

app.use('*', (req : Request, res : Response) => {

})

app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}!`);
});
