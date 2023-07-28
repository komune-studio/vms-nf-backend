import {NextFunction, Request as Req, Response as Res} from "express";
import {HTTPError, InternalServerError} from "../utils/error.utils";

export default async function handleErrors(error : Error, req : Req, res : Res, _ : NextFunction) {
    let response : HTTPError;

    if (error instanceof Response) {
        const jsonErr = await error.json();

        if(jsonErr.code && jsonErr.message) {
            return res.status(jsonErr.code).send({
                error: jsonErr.code,
                message: jsonErr.message
            });
        }
    }

    if (error instanceof HTTPError)
        response = error;
    else
        response = new InternalServerError(error.message);

    // console.log(error);
    return res.status(response.statusCode).send({
        error: response.errorCode,
        message: response.message
    });
}
