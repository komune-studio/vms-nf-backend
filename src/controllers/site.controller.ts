import {NextFunction, Request, Response} from "express";
import SiteDAO from "../daos/site.dao";
import VehicleDAO from "../daos/vehicle.dao";
import moment from "moment";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import fs from "fs";
import {fsUnlink} from "../utils/fs.utils"

export default class SiteController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        try {
            let data = await SiteDAO.getAll();

            res.send(data.map(site => ({...site, image: site.image ? Buffer.from(site.image).toString('base64') : null})))
        } catch (err) {
            return next(err);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            let data = await SiteDAO.getById(parseInt(req.params.id));

            res.send({data})
        } catch (err) {
            return next(err);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        console.log(req.body)

        const file = req.file;
        let bodyImage = {}

        if(file) {
            bodyImage = {image: fs.readFileSync(file.path)}

            await fsUnlink(file.path)
        }

        try {
            let site = await SiteDAO.create({...req.body, ...bodyImage});
            res.send({
                success: true,
                site: {
                    ...site,
                    id: site.id.toString(),
                }
            })
        } catch (err) {
            return next(err);
        }
    }

    static async update(req: Request, res: Response, next: NextFunction) {
        const file = req.file;
        let bodyImage = {}

        if(file) {
            bodyImage = {image: fs.readFileSync(file.path)}

            await fsUnlink(file.path)
        }

        try {
            await SiteDAO.update(parseInt(req.params.id), {...req.body, ...bodyImage});
            res.send({success: true})
        } catch (err) {
            console.log(err)
            return next(err);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        try {
            await SiteDAO.update(parseInt(req.params.id), {deleted_at: new Date()});
            res.send({success: true})
        } catch (err) {
            return next(err);
        }
    }

    static async assignStream(req: Request, res: Response, next: NextFunction) {
        try {
            const mapSiteStream = await MapSiteStreamDAO.getByStreamId(req.body.stream_id)

            if(mapSiteStream) {
                await MapSiteStreamDAO.update(mapSiteStream.id, {site_id: parseInt(req.params.id)})
            } else {
                await MapSiteStreamDAO.create({site_id: parseInt(req.params.id), stream_id: req.body.stream_id})
            }

            res.send({success: true})
        } catch (err) {
            console.log(err)

            return next(err);
        }
    }
}
