import PrismaService from "../services/prisma.service"
import moment from "moment";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const enrolledFace = prisma.enrolled_face;

export default class EnrolledFaceDAO {
    static async getByFaceId(id : string) {
        const faceId = BigInt(id);

        let result = enrolledFace.findFirst({
            where: {
                face_id: faceId
            }
        });

        return result;
    }

    static async getByIdentityNumber(identityNo : string) {
        let result = enrolledFace.findFirst({
            where: {
                identity_number: identityNo
            }
        });

        return result;
    }

    static async getExpiredFaceId() {
        //enrollment only valid in the same day when they register
        const sql = `SELECT id FROM enrolled_face WHERE deleted_at IS NULL AND created_at < current_date AND status != 'BLACKLIST' ORDER BY id ASC;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async recover(id : number) {
        let result = enrolledFace.update({
            where: {
                id
            },
            data: {deleted_at: null}
        });

        return result;
    }
}
