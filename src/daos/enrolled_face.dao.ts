import PrismaService from "../services/prisma.service"
import moment from "moment";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const enrolledFace = prisma.enrolled_face;

export default class EnrolledFaceDAO {
    static async getAll(limit : number, page : number, search : string, status : string, active : boolean = true, ids? : number[]) {
        let result = enrolledFace.findMany({
            orderBy: {
                created_at: 'desc'
            },
            skip: page && limit ? (page - 1) * limit : undefined,
            take: limit ? limit : undefined,
            where: {
                id: ids ? {in: ids} : undefined,
                name: {
                    contains: search,
                    mode: 'insensitive'
                },
                status: {
                    equals: status
                },
                // deleted_at: active ? null : {not: null}
            },
        });

        return result;
    }

    static async getCount(search : string, status : string, active : boolean = true, ids? : number[]) {
        let result = enrolledFace.aggregate({
            _count: {id: true},
            where: {
                id: ids ? {in: ids} : undefined,
                name: {
                    contains: search,
                    mode: 'insensitive'
                },
                status: {
                    equals: status
                },
                // deleted_at: active ? null : {not: null}
            },
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

    static async blacklist(id : number) {
        let result = enrolledFace.update({
            where: {
                id
            },
            data: {status: 'BLACKLIST', deleted_at: null}
        });

        return result;
    }
    static async unblacklist(id : number) {
        let result = enrolledFace.update({
            where: {
                id
            },
            data: {status: 'VISITOR', deleted_at: null}
        });

        return result;
    }

    static async addAdditionalInfoColumn() {
        //enrollment only valid in the same day when they register
        const sql = `ALTER TABLE enrolled_face ADD COLUMN IF NOT EXISTS additional_info JSONB default '{}';`

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
