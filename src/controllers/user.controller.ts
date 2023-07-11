import {NextFunction, Request, Response} from "express";
import UserDAO from "../daos/user.dao";
import {BadRequestError, ConflictError, InvalidCredentialsError, UnauthorizedError} from "../utils/error.utils";
import AdminDAO from "../daos/admin.dao";
import SecurityUtils from "../utils/security.utils";
import SiteDAO from "../daos/site.dao";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import jwt from "jsonwebtoken";
import fs from "fs";

export default class UserController {
    static async login(req: Request, res: Response, next: NextFunction) {

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
            let user = await UserDAO.getByEmail(email);

            if (user === null) {
                return next(new InvalidCredentialsError("Invalid credentials."));
            }

            let passwordIsCorrect = SecurityUtils.comparePassword(user.password, password, user.salt);

            if (!passwordIsCorrect) {
                return next(new InvalidCredentialsError("Invalid credentials."));
            }

            let allowedSites = [];
            let allowedStreams = [];

            let result: any = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: 'USER',
            }

            result.token = jwt.sign(result, secret, {expiresIn: "1d"})

            if(user.photo) {
                result.photo = Buffer.from(user.photo).toString('base64')
            }

            res.send(result);

        } catch (e) {
            return next(e);
        }
    }

    static async authenticate(req: Request, res: Response, next: NextFunction) {
        try {
            const {id} = req.decoded;

            let user = await UserDAO.getById(id);
            if (user === null) {
                return next(new InvalidCredentialsError("Invalid credentials."));
            }

            let result: any = {
                id: user.id,
                name: user.name,
                email: user.email,
                role: 'USER'
            }

            if(user.photo) {
                result.photo = Buffer.from(user.photo).toString('base64')
            }

            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            let data = await UserDAO.getAll();

            res.send(data.map(item => ({...item, photo: item.photo ? Buffer.from(item.photo).toString('base64') : null})))
        } catch (err) {
            return next(err);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            let data = await UserDAO.getById(req.params.id);

            res.send({data: data ? {...data, photo: data.photo ? Buffer.from(data.photo).toString('base64') : null} : null})
        } catch (err) {
            return next(err);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        const {file} = req;

        try {
            let user = await UserDAO.getByEmail(req.body.email);
            if (user !== null) {
                return next(new ConflictError("Duplicate email.", "USER"));
            }

            const salt = SecurityUtils.generateSalt();
            // @ts-ignore
            let data = await UserDAO.create({...req.body, photo: file ? fs.readFileSync(file.path) : null, salt, password: SecurityUtils.generatePassword(req.body.password, salt),});
            res.send({
                success: true,
                data
            })
        } catch (err) {
            console.log(err)

            return next(err);
        } finally {
            if(file) {
                fs.rmSync(file.path);
            }
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        const {file} = req;

        try {
            const body = req.body;

            if(file) {
                body.photo = fs.readFileSync(file.path)
            }

            console.log(req.params.id)
            console.log(body)

            await UserDAO.update(req.params.id, body);
            res.send({success: true})
        } catch (err) {
            return next(err);
        } finally {
            if(file) {
                fs.rmSync(file.path);
            }
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await UserDAO.update(req.params.id, {active: false});
            res.send({success: true})
        } catch (err) {
            return next(err);
        }
    }
}
