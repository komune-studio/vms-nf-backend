import {NextFunction, Request as Req, Response as Res} from "express";
import fs from "fs";
import EmployeeDAO from "../daos/employee.dao";
import { fsUnlink } from "../utils/fs.utils";
import IdentifAI from "../utils/identifai.utils";
import Nodeflux from "../utils/nodeflux.utils";
import {BadRequestError, NotFoundError} from "../utils/error.utils";

export default class EmployeeController {
    static async create(req : Req, res : Res, next : NextFunction) {
        const files : any = req.files;

        if (!files.ktp_image || !files.face_image) {
            return next(new BadRequestError({
                "ktp_image": !files.ktp_image ? "KTP image is not defined." : undefined,
                "face_image": !files.face_image ? "Face image is not defined." : undefined,
            }))
        }

        if (files.ktp_image.length > 1 || files.face_image.length > 1) {
            return next(new BadRequestError({
                "ktp_image": files.ktp_image.length > 1 ? "Please only provide 1 image." : undefined,
                "face_image": files.face_image.length > 1 ? "Please only provide 1 image." : undefined,
            }))
        }

        const ktp_image_base64 = fs.readFileSync(files.ktp_image[0].path, {encoding: "base64"});
        const ktp_image_mimetype = files.ktp_image[0].mimetype;
        const ktp_image = `${ktp_image_mimetype};${ktp_image_base64}`

        const face_image_base64 = fs.readFileSync(files.ktp_image[0].path, {encoding: "base64"});
        const face_image_mimetype = files.face_image[0].mimetype;
        const face_image = `${face_image_mimetype};${face_image_base64}`

        try {
            let ocrData = await IdentifAI.executeOCR(ktp_image_base64, ktp_image_mimetype)
            let ocrResult = ocrData.result[0];

            let body = {
                name: ocrResult.nama,
                address: `${ocrResult.alamat}, RT/RW ${ocrResult.rt_rw}, ${ocrResult.kelurahan_desa}, KEC. ${ocrResult.kecamatan}, ${ocrResult.kabupaten_kota}, ${ocrResult.provinsi}`,
                ktp_image: Buffer.from(ktp_image),
                face_image: Buffer.from(face_image),
            }

            let result = await EmployeeDAO.create(body);
            let enrollment = await Nodeflux.enrollEmployeeFace(result.id, face_image_base64)

            res.send({
                success: true,
                data: {
                    id: result.id,
                    name: result.name,
                    address: result.address,
                    enrollment: enrollment
                }
            })

        } catch (e) {
            return next(e)
        } finally {
            await fsUnlink(files.ktp_image[0].path);
            await fsUnlink(files.face_image[0].path);
        }
    }

    static async getAll(req : Req, res : Res, next : NextFunction) {
        try {
            let result = await EmployeeDAO.getAll();

            let body = result.map(obj => ({
                ...obj,
                face_image: {
                    type: obj.face_image ? obj.face_image.toString().split(';')[0] : undefined,
                    base64: obj.face_image ? obj.face_image.toString().split(';')[1] : undefined,
                }
            }))

            res.send(body);

        } catch (e) {
            return next(e)
        }
    }

    static async getById(req : Req, res : Res, next : NextFunction) {
        let {id} = req.params;

        if (isNaN(parseInt(id))) {
            return next(new BadRequestError("ID is invalid!"));
        }

        try {
            let result = await EmployeeDAO.getById(parseInt(id));

            if (result === null) {
                return next(new NotFoundError(`Employee with ID ${id} does not exist.`))
            }

            let faceImage = result.face_image?.toString().split(";");

            let body = {
                ...result,
                ktp_image: undefined,
                face_image: {
                    type: faceImage ? faceImage[0] : undefined,
                    base64: faceImage ? faceImage[1] : undefined
                },
            }
            res.send(body);

        } catch (e) {
            return next(e)
        }
    }

    static async update(req : Req, res : Res, next : NextFunction) {

        let {id} = req.params;
        let {name, address} = req.body;

        if (isNaN(parseInt(id))) {
            return next(new BadRequestError("ID is invalid!"));
        }

        try {
            let employee = await EmployeeDAO.getById(parseInt(id));
            if (employee === null) {
                return next(new NotFoundError(`Employee with ID ${id} does not exist.`));
            }

            let body = {name, address}
            let result = await EmployeeDAO.update(parseInt(id), body);

            res.send({
                success: true, data: {
                    name: result.name,
                    address: result.address
                }
            });

        } catch (e) {
            return next(e);
        }
    }

    static async delete(req : Req, res : Res, next : NextFunction) {

        let {id} = req.params;

        if (isNaN(parseInt(id))) {
            return next(new BadRequestError("ID is invalid!"));
        }

        try {
            let employee = await EmployeeDAO.getById(parseInt(id));
            if (employee === null) {
                return next(new NotFoundError(`Employee with ID ${id} does not exist.`));
            }

            await EmployeeDAO.delete(parseInt(id));

            res.send({
                success: true
            });

        } catch (e) {
            return next(e);
        }
    }
}