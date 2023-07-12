import PrismaService from "../services/prisma.service"
import moment from "moment";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const faceImage = prisma.face_image;

export default class FaceImageDAO {
    static async getByEnrolledFaceIds(ids: number[]) {
        let result = faceImage.findMany({
            orderBy: {id: 'desc'},
            select: {
                enrolled_face_id: true,
                image_thumbnail: true
            },
            where: {
                enrolled_face_id: {
                    in: ids
                },
                deleted_at: {equals: null}
            }
        });

        return result;
    }

    static async getLatestImgThumbnail(id : number) {
        let result = faceImage.findFirst({
            orderBy: {id: 'desc'},
            select: {
                image_thumbnail: true
            },
            where: {
                enrolled_face_id: id
            }
        });

        return result;
    }
}
