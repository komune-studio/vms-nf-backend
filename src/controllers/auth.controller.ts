import { NextFunction, Request, Response } from "express";

export default class AuthController {
    static async login(req : Request, res : Response, next : NextFunction) {
        res.send({message: "Unimplemented"});
    }
}