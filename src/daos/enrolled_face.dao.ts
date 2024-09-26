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

    static async getByName(name : string) {
        let result = enrolledFace.findFirst({
            where: {
                name,
                deleted_at: {
                    equals: null
                }
            }
        });

        return result;
    }

    static async getFaceIdByEnrolledFaceId(id : number) {
        let result = enrolledFace.findFirst({
            select: {
                face_id: true
            },
            where: {
                id: id
            }
        });

        return result;
    }

    static async getByIds(ids : number[]) {
        console.log(ids)

        let result = enrolledFace.findMany({
            where: {
                id: {
                    in: ids
                }
            }
        });

        return result;
    }

    static async addAdditionalInfoColumn() {
        //enrollment only valid in the same day when they register
        const sql = `ALTER TABLE enrolled_face ADD COLUMN IF NOT EXISTS additional_info JSONB default '{}'`;

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAdditionaInfo(id : number) {
        let result = enrolledFace.findFirst({
            select: {
                additional_info: true
            },
            where: {
                id
            },
        });

        return result;
    }

    static async updateAdditionalInfo(id : number, additionalInfo: any) {
        let result = enrolledFace.update({
            where: {
                id
            },
            data: {additional_info: JSON.parse(additionalInfo)}
        });

        return result;
    }
}

