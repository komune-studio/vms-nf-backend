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

    static async getFaceExcludeDssIds(dssIds : string) {
        const sql = `select id from enrolled_face where ${dssIds ? ` (cast(additional_info->>'dss_id' as integer) NOT IN (${dssIds}) OR cast(additional_info->>'dss_id' as integer) IS NULL) AND ` : ''} deleted_at is null;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getFaceByDssId(dssId : string) {
        const sql = `select id from enrolled_face where additional_info->>'dss_id' = '${dssId}' AND deleted_at is null;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getFacesByDssIds(dssIds : string) {
        const sql = `select * from enrolled_face where cast(additional_info->>'dss_id' as integer) IN (${dssIds}) AND deleted_at is null;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountWithPagination(keyword: String, status: String, startDate: String, endDate: String) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status

        const sql = `SELECT count(id) FROM enrolled_face WHERE ${!status ? ' 1 = 1 ' : ` deleted_at IS ${status === 'out' ? ' NOT ' : ' '} NULL`} ${keyword ? ` AND name ilike '%${keyword}%' ` : ' '} ${startDate ? ` AND created_at >= '${startDate}'` : ''} ${endDate ? ` AND created_at <= '${endDate}'` : ''};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAllWithPagination(keyword: String, status: String, startDate: String, endDate: String, page: number, limit: number) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status

        const sql = `SELECT * FROM enrolled_face WHERE ${!status ? ' 1 = 1 ' : ` deleted_at IS ${status === 'out' ? ' NOT ' : ' '} NULL`} ${keyword ? ` AND name ilike '%${keyword}%' ` : ' '} ${startDate ? ` AND created_at >= '${startDate}'` : ''} ${endDate ? ` AND created_at <= '${endDate}'` : ''} ORDER BY created_at DESC ${limit ? ` LIMIT ${limit} ` : ''} ${limit && page ? ` OFFSET ${limit * (page - 1)} ` : ''};`

        console.log(sql)

        return prisma.$queryRaw(Prisma.raw(sql))
    }
}

