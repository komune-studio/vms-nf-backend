import PrismaService from "../services/prisma.service"
import {Prisma} from "../prisma/nfvisionaire";
const prisma = PrismaService.getVisionaire();
const enrolledFace = prisma.enrolled_face;

export default class EnrolledFaceDAO {
    static async getById(id : number) {
        const faceId = BigInt(id);

        let result = enrolledFace.findFirst({
            where: {
                id
            }
        });

        return result;
    }

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

    static async getAdditionalInfo(id : number) {
        let result = enrolledFace.findFirst({
            where: {
                id
            },
            select: {
                additional_info: true
            }
        });

        return result;
    }


    static async updateAdditionalInfo(id : string, additionalInfo : any) {
        let result = enrolledFace.update({
            where: {
                id: parseInt(id)
            },
            data: {
                additional_info: additionalInfo
            }
        });

        return result;
    }
}
