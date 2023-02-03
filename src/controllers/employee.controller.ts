import { NextFunction, Request, Response as Res } from "express";
import fs from "fs";
import EmployeeDAO from "../daos/employee.dao";
import { fsUnlink } from "../utils/fs.utils";
import IdentifAI from "../utils/identifai.utils";

export default class EmployeeController {
    static async create(req : Request, res : Res, next : NextFunction) {
        try {
            const files : any = req.files;

            if (!files || !files.ktp_image || !files.face_image) {
                return res.status(400).send({
                    error: "Files not uploaded!"
                })
            }

            if (files.ktp_image.length > 1 || files.face_image.length > 1) {
                return res.status(400).send({
                    error: "Too many files!"
                })
            }
            
            const ktp_image_base64 = fs.readFileSync(files.ktp_image[0].path, {encoding: "base64"});
            const ktp_image_mimetype = files.ktp_image[0].mimetype;
            const ktp_image = `data:${ktp_image_base64};base64,${ktp_image_mimetype}`

            const face_image_base64 = fs.readFileSync(files.ktp_image[0].path, {encoding: "base64"});
            const face_image_mimetype = files.face_image[0].mimetype;
            const face_image = `data:${face_image_base64};base64,${face_image_mimetype}`

            let ocrData = await IdentifAI.executeOCR(ktp_image_base64, ktp_image_mimetype)
            let ocrResult = ocrData.result[0];

            let body = {
                name: ocrResult.nama,
                address: `${ocrResult.alamat}, RT/RW ${ocrResult.rt_rw}, ${ocrResult.kelurahan_desa}, KEC. ${ocrResult.kecamatan}, ${ocrResult.kabupaten_kota}, ${ocrResult.provinsi}`,
                ktp_image: Buffer.from(ktp_image),
                face_image: Buffer.from(face_image),
            }

            let result = await EmployeeDAO.create(body);
            
            await fsUnlink(files.ktp_image[0].path);
            await fsUnlink(files.face_image[0].path);
    
            res.send(body)
        } catch (e) {
            if (e instanceof Response) {
                console.log(await e.json());
            }
        }
    }
}