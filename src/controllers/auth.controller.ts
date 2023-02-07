import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

import {BadRequestError, ConflictError, InvalidCredentialsError} from "../utils/error.utils";
import AdminDAO from "../daos/admin.dao";
import SecurityUtils from "../utils/security.utils";

export default class AuthController {
    static async login(req : Request, res : Response, next : NextFunction) {

        if (!process.env.SECRET_KEY) {
            return next(new Error("SECRET_KEY is not defined in .env"));
        }

        const secret = process.env.SECRET_KEY;
        const {email, password} = req.body;

        if (!email || !password) {
            return next(new BadRequestError({
                email: !email ? "Email is not defined." : undefined,
                password: !password ? "Password is not defined." : undefined,
            }))
        }

        try {
            let admin = await AdminDAO.getByEmail(email);

            if (admin === null) {
                return next(new InvalidCredentialsError("Invalid credentials."));
            }

            let passwordIsCorrect = SecurityUtils.comparePassword(admin.password, password, admin.salt);

            if (!passwordIsCorrect) {
                return next(new InvalidCredentialsError("Invalid credentials."));
            }

            let result : any = {
                id: admin.id,
                email: admin.email,
                role: "admin"
            }

            result.token = jwt.sign(result, secret, {expiresIn: "1d"})

            res.send(result);

        } catch (e) {
            return next(e);
        }
    }

    static async generatePassword(req : Request, res : Response, next : NextFunction) {
        const {password} = req.body;

        if (!password) {
            return next(new BadRequestError({
                password: !password ? "Password is not defined." : undefined,
            }))
        }

        let salt = SecurityUtils.generateSalt();
        let hash = SecurityUtils.generatePassword(password, salt);

        res.send({
            salt: salt,
            password: hash
        })
    }

    static async getAdmins(req : Request, res : Response, next : NextFunction) {
        try {
            let result = await AdminDAO.getAll();
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async createAdmin(req : Request, res : Response, next : NextFunction) {
        let {email, password} = req.body;

        if (!email || !password) {
            return next(new BadRequestError({
                email: !email ? "Email is not defined." : undefined,
                password: !password ? "Password is not defined." : undefined,
            }))
        }

        try {
            let admin = await AdminDAO.getByEmail(email);
            if (admin !== null) {
                return next(new ConflictError("Email is already registered.", "email"));
            }

            let body : any = {email}

            body.salt = SecurityUtils.generateSalt();
            body.password = SecurityUtils.generatePassword(password, body.salt)

            await AdminDAO.create(body);

            res.send({success: true});
        } catch (e) {
            return next(e);
        }
    }
}