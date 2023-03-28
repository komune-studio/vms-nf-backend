import PrismaService from "../services/prisma.service"
import moment from "moment";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const faceImage = prisma.face_image;

export default class FaceImageDAO {
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
