import {NextFunction, Request, Response} from "express";
import {ForbiddenError, InternalServerError, UnauthorizedError} from "../utils/error.utils";
import jwt from "jsonwebtoken";

function processToken(req : Request) {
    if (!req.headers['authorization'])
        throw new UnauthorizedError("Authorization header is not defined.");

    let token = req.headers['authorization'].split(" ")[1];
    if (!token)
        throw new UnauthorizedError("Token is not defined.");

    let secret = process.env.SECRET_KEY;
    if (!secret)
        throw new Error("SECRET_KEY is not defined in .env");

    try {
        req.decoded = jwt.verify(token, secret);
    } catch (e : any) {
        if (e.name === "TokenExpiredError") {
            throw new UnauthorizedError("Token has expired.", "EXPIRED_TOKEN");
        }
        else {
            console.log(e.message);
            throw new InternalServerError(null)
        }
    }
}

export function authAdmin(req : Request, res : Response, next : NextFunction) {
    try {
        processToken(req);
        if (req.decoded.role !== "admin")
            return next(new ForbiddenError("User is not authorized to access this resource."))
        next();
    } catch (e) {
        return next(e);
    }
}