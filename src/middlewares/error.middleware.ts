import {NextFunction, Request, Response} from "express";
import {HTTPError, InternalServerError} from "../utils/error.utils";

export default function handleErrors(error : Error, req : Request, res : Response, _ : NextFunction) {
    let response : HTTPError;

    if (error instanceof HTTPError)
        response = error;
    else
        response = new InternalServerError(error.message);

    return res.status(response.statusCode).send({
        error: response.errorCode,
        message: response.message
    });
}