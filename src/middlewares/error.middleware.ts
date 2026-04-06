import {NextFunction, Request as Req, Response as Res} from "express";
import {HTTPError, InternalServerError} from "../utils/error.utils";

export default async function handleErrors(error : Error, req : Req, res : Res, _ : NextFunction) {
    let response : HTTPError;

    if (error instanceof Response) {
        try {
            const jsonErr = await error.json();

            if (jsonErr.code && jsonErr.message) {
                return res.status(400).send({
                    error: jsonErr.code,
                    message: jsonErr.message
                });
            }
        } catch (_) {
            // Body already consumed; fall through to generic error handling
        }
    }

    if (error instanceof HTTPError)
        response = error;
    else
        response = new InternalServerError(error.message);

    // console.log(error);
    try {
        return res.status(response.statusCode).send({
            error: response.errorCode,
            message: response.message
        });
    } catch (e) {
        return res.status(500).send({
            error: response.errorCode,
            message: response.message
        });
    }

}
