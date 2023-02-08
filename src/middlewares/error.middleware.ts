import {NextFunction, Request as Req, Response as Res} from "express";
import {HTTPError, InternalServerError} from "../utils/error.utils";

export default function handleErrors(error : Error, req : Req, res : Res, _ : NextFunction) {
    let response : HTTPError;

    if (error instanceof Response)
        error.json().then(value => console.log(value));

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