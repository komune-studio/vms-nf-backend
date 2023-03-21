import {NextFunction, Request, Response} from "express";
import {ForbiddenError, InternalServerError, UnauthorizedError} from "../utils/error.utils";
import jwt from "jsonwebtoken";
import AdminDAO from "../daos/admin.dao";

async function processToken(req : Request) {
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

        const admin = await AdminDAO.getById(req.decoded.id)

        // @ts-ignore
        if(!admin.active) {
            throw new UnauthorizedError("EXPIRED_TOKEN");
        }
    } catch (e : any) {
        console.log(e)

        if (e.name === "TokenExpiredError" || e.message === 'EXPIRED_TOKEN') {
            throw new UnauthorizedError("Token has expired.", "EXPIRED_TOKEN");
        }
        else {
            console.log(e.message);
            throw new InternalServerError(null)
        }
    }
}

export async function authSuperAdmin(req : Request, res : Response, next : NextFunction) {
    try {
        await processToken(req);
        if (req.decoded.role !== "SUPERADMIN")
            return next(new ForbiddenError("User is not authorized to access this resource."))
        next();
    } catch (e) {
        return next(e);
    }
}

export async function authAdmin(req : Request, res : Response, next : NextFunction) {
    try {
        await processToken(req);
        if (req.decoded.role !== "ADMIN" && req.decoded.role !== "SUPERADMIN")
            return next(new ForbiddenError("User is not authorized to access this resource."))
        next();
    } catch (e) {
        return next(e);
    }
}

export async function authAll(req : Request, res : Response, next : NextFunction) {
    try {
        await processToken(req);
        if (!req.decoded.role)
            return next(new ForbiddenError("User is not authorized to access this resource."))
        next();
    } catch (e) {
        return next(e);
    }
}
