// @ts-nocheck
import {NextFunction, Request, Response} from "express";
import VisitEventDAO from "../daos/visit_event.dao";
import {BadRequestError, ConflictError, NotFoundError} from "../utils/error.utils";
import BookingDAO from "../daos/booking.dao";
import sharp from "sharp";
import fs from "fs";
import request from "../utils/api.utils";
import aws from 'aws-sdk'
import QRImage from 'qr-image'

aws.config = new aws.Config();
aws.config.accessKeyId = 'GUNXIGZGIXJEFQGGUXAK'
aws.config.secretAccessKey = 'EcLSassM8xA9/EJpNMf2Hvt+E42+R2PYLvM0u8h3N44'

const spacesEndpoint = new aws.Endpoint('sgp1.digitaloceanspaces.com');

const s3 = new aws.S3({
    endpoint: spacesEndpoint
});


export default class BookingController {
    static async getAll(req: Request, res: Response, next: NextFunction) {
        let {id, page, limit, history} = req.query;

        history = history === 'true'

        if (!page || !limit) {
            return next(new BadRequestError({
                page: !page ? "Page is not defined." : undefined,
                limit: !limit ? "Limit is not defined." : undefined,
            }))
        }

        try {
            // @ts-ignore
            let count = await BookingDAO.getCount(id);

            // @ts-ignore
            let data = await BookingDAO.getAll(id, parseInt(page), parseInt(limit), history);

            // @ts-ignore
            res.send({
                total_page:  Math.floor(((parseInt(count[0].count) - 1) / limit) + 1),
                total_data: parseInt(count[0].count),
                data: data.map(item => {
                    // @ts-ignore
                    return {
                        ...item,
                        id: parseInt(item.id),
                        image: Buffer.from(item.image).toString('base64')
                    }
                })
            });
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }

    static async getById(req: Request, res: Response, next: NextFunction) {
        try {
            let result = await BookingDAO.getById(parseInt(req.params.id));

            console.log(result)

            // @ts-ignore
            res.send(result ? {...result, id: parseInt(result.id), image:  Buffer.from(result.image).toString('base64')} : {});
        } catch (e) {
            console.error(e)

            return next(e);
        }
    }

    static async create(req: Request, res: Response, next: NextFunction) {
        const uploadWithoutMulter = (key:string, body:any, contentType:string)=>{
            return s3.upload({
                Body: body,
                Key: key,
                ACL: 'public-read',
                Bucket: 'wellsource',
                ContentType: contentType
            }).promise()

        }

        const file = req.file;
        if (!file) {
            return next(new BadRequestError("Image is required."));
        }


        try {
            const lastId = await BookingDAO.getLastId();
            let id;

            if(!lastId) {
                id = 1000000000
            } else {
                id = lastId.id + BigInt(1)
            }

            const response = await BookingDAO.create({id, ...req.body, image: fs.readFileSync(file.path), employee_id: req.body.employee_id ? parseInt(req.body.employee_id) : null, birth_date:  req.body.birth_date ? new Date(req.body.birth_date) : null});

            if(req.body.phone_num) {
                const dir = `intellivent-register/qr`
                const fileName = `vms_booking_qr-${response.id}_${Date.now()}.png`
                const qrImg = QRImage.image(response.id.toString(), { type: "png" })

                const result = await uploadWithoutMulter(`${dir}/${fileName}`, qrImg, 'image/png')



                const waResponse = await request("https://sendtalk-api.taptalk.io/api/v1/message/send_whatsapp", 'POST', {
                    "phone": req.body.phone_num.charAt(0) === '0' ? '+62' + req.body.phone_num.substring(1) : req.body.phone_num,
                    "messageType": "image",
                    "caption": `Your Booking QR (booking number: ${response.id})`,
                    "filename": 'booking-qr.png',
                    "body": result.Location
                }, false, {'API-Key': '3eb70f01c405172336163f19fb0f246a09dd97fcc2babf5fd64f887a8ec502ce'});

                console.log(waResponse)
            }

            res.send({success: true, id: response.id.toString()});
        } catch (e) {
            console.log(e)

            return next(e);
        }  finally {
            fs.rmSync(file.path);
        }
    }

    static async inactivate(req: Request, res: Response, next: NextFunction) {
        try {
            await BookingDAO.inactivate(parseInt(req.params.id));

            res.send({success: true});
        } catch (e) {
            console.error(e)

            return next(e);
        }
    }

    static async checkOut(req: Request, res: Response, next: NextFunction) {
        try {
            await BookingDAO.checkout(parseInt(req.params.id));

            res.send({success: true});
        } catch (e) {
            console.error(e)

            return next(e);
        }
    }

    static async getBookingByFace(req: Request, res: Response, next: NextFunction) {
        const THRESHOLD = .8;

        try {
            const {image, mode} = req.body;

            const booking = await BookingDAO.getAll(null, null, null, mode !== "CHECK_IN", mode === "CHECK_OUT" ? false : null);

            let selectedBooking = null;

            for(const data of booking) {
                const buffer = await sharp(data.image).resize(1000).jpeg({quality: 80}).toBuffer();

                const response = await request(`${process.env.NF_FREMISN_API_URL}/face/match`, 'POST', {
                    image_a: {
                        content: image
                    },
                    image_b: {
                        content: Buffer.from(buffer).toString('base64')
                    }
                });

                if(!selectedBooking || selectedBooking.similarity < response.face_match.similarity) {
                    selectedBooking = {...data, similarity: response.face_match.similarity}
                }

            }

            console.log({...selectedBooking, id: parseInt(selectedBooking.id)})

            res.send(selectedBooking && selectedBooking.similarity >= THRESHOLD ? {...selectedBooking, id: parseInt(selectedBooking.id), image:  Buffer.from(selectedBooking.image).toString('base64')} : {});
        } catch (e) {
            console.error(e)

            return next(e);
        }
    }

    static async delete(req: Request, res: Response, next: NextFunction) {
        let id = parseInt(req.params.id);

        try {
            let booking = await BookingDAO.getById(id);

            if (booking === null) {
                return next(new NotFoundError("Booking not found.", "id"));
            }

            await BookingDAO.delete(id);

            res.send({success: true});
        } catch (e) {
            console.log(e)

            return next(e);
        }
    }
}
