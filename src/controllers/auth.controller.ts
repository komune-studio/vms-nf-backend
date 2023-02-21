import {NextFunction, Request, Response} from "express";
import jwt from "jsonwebtoken";

import {BadRequestError, ConflictError, InvalidCredentialsError, NotFoundError} from "../utils/error.utils";
import AdminDAO from "../daos/admin.dao";
import SecurityUtils from "../utils/security.utils";

export default class AuthController {
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
            let admin = await AdminDAO.getByEmail(email);

            if (admin === null) {
                return next(new InvalidCredentialsError("Invalid credentials."));
            }

            let passwordIsCorrect = SecurityUtils.comparePassword(admin.password, password, admin.salt);

            if (!passwordIsCorrect) {
                return next(new InvalidCredentialsError("Invalid credentials."));
            }

            let result: any = {
                id: admin.id,
                name: admin.name,
                email: admin.email,
                role: admin.role
            }

            result.token = jwt.sign(result, secret, {expiresIn: "1d"})

            res.send(result);

        } catch (e) {
            return next(e);
        }
    }

    static async generatePassword(req: Request, res: Response, next: NextFunction) {
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

    static async getAdmins(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await AdminDAO.getAll();
            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await AdminDAO.getById(parseInt(req.params.id));

            if(result) {
                // @ts-ignore
                delete result.password;
                // @ts-ignore
                delete result.salt;
            }

            res.send(result);
        } catch (e) {
            return next(e);
        }
    }

    static async createAdmin(req: Request, res: Response, next: NextFunction) {
        let {email, name, role, password} = req.body;

        if (!email || !password) {
            return next(new BadRequestError({
                email: !email ? "Email is not defined." : undefined,
                name: !name ? "Name is not defined." : undefined,
                password: !password ? "Password is not defined." : undefined,
            }))
        }

        try {
            let admin = await AdminDAO.getByEmail(email);
            if (admin !== null) {
                return next(new ConflictError("Email is already registered.", "email"));
            }

            let body: any = {email, name, role}

            body.salt = SecurityUtils.generateSalt();
            body.password = SecurityUtils.generatePassword(password, body.salt)

            await AdminDAO.create(body);

            res.send({success: true});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async deleteAdmin(req: Request, res: Response, next: NextFunction) {
        let id = parseInt(req.params.id);

        try {
            let admin = await AdminDAO.getById(id);

            if (admin === null) {
                return next(new NotFoundError("Admin not found.", "id"));
            }

            await AdminDAO.delete(id);

            res.send({success: true});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        let id = parseInt(req.params.id);
        const {email, name, role} = req.body

        try {
            let admin = await AdminDAO.getById(id);

            if (admin === null) {
                return next(new NotFoundError("Admin not found.", "id"));
            }

            await AdminDAO.update(id, {
                email,
                name,
                role
            });

            res.send({success: true});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async changePassword(req: Request, res: Response, next: NextFunction) {
        let id = parseInt(req.params.id);
        const {password} = req.body

        try {
            let admin = await AdminDAO.getById(id);

            if (admin === null) {
                return next(new NotFoundError("Admin not found.", "id"));
            }

            let salt = SecurityUtils.generateSalt();
            let hash = SecurityUtils.generatePassword(password, salt);


            await AdminDAO.update(id, {
                password: hash,
                salt
            });

            res.send({success: true});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
