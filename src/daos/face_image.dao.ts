import PrismaService from "../services/prisma.service"
import moment from "moment";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const faceImage = prisma.face_image;

export default class FaceImageDAO {
    static async getByEnrolledFaceIds(ids: number[], image: boolean) {
        let result = faceImage.findMany({
            orderBy: {id: 'asc'},
            select: {
              id: true,
              enrolled_face_id: true,
              variation: true,
              created_at: true,
              image_thumbnail: image
            },
            where: {
                enrolled_face_id: {
                    in: ids
                }
            }
        });

        return result;
    }

    static async getByEnrolledFaceId(id : number) {
        const faceId = BigInt(id);

        let result = faceImage.findMany({
            where: {
                enrolled_face_id: faceId
            }
        });

        return result;
    }

    static async recover(id : number) {
        let result = faceImage.update({
            where: {
                id
            },
            data: {deleted_at: null}
        });

        return result;
    }
}
