import PrismaService from "../services/prisma.service"
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

    static async getByFaceIds(ids : bigint[]) {
        let result = enrolledFace.findMany({
            where: {
                face_id: {in: ids}
            }
        });

        return result;
    }

    static async addAdditionalInfoColumn() {
        //enrollment only valid in the same day when they register
        const sql = `ALTER TABLE enrolled_face ADD COLUMN IF NOT EXISTS additional_info JSONB default '{}';`

        return prisma.$queryRaw(Prisma.raw(sql))
    }
}
