import PrismaService from "../services/prisma.service"
import { Prisma } from "../prisma/nfvisionaire";

const prisma = PrismaService.getFace();
const enrolledFace = prisma.enrolled_face;

export default class EnrolledFaceDAO {
    static async getByFaceIds(ids: number[]) {
        let result = enrolledFace.findMany({
            orderBy: {
                name: 'asc'
            },
            where: {
                face_id: { in: ids }
            },
        });

        return result;
    }

    static async getByFaceId(id: string) {
        const faceId = BigInt(id);

        let result = enrolledFace.findFirst({
            where: {
                face_id: faceId
            }
        });

        return result;
    }

    static async getByName(name: string) {
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

    static async getFaceIdByEnrolledFaceId(id: number) {
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

    static async getByIds(ids: number[]) {
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

    static async getAdditionaInfo(id: number) {
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

    static async updateAdditionalInfo(id: number, additionalInfo: any) {
        let result = enrolledFace.update({
            where: {
                id
            },
            data: { additional_info: JSON.parse(additionalInfo) }
        });

        return result;
    }

    static async getFaceExcludeDssIds(dssIds: string) {
        const sql = `select id from enrolled_face where ${dssIds ? ` (cast(additional_info->>'dss_id' as integer) NOT IN (${dssIds}) OR cast(additional_info->>'dss_id' as integer) IS NULL) AND ` : ''} deleted_at is null AND status != 'EMPLOYEE';`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getFaceExcludePersonIds(ids: string | undefined) {
        const sql = `select id from enrolled_face where status = 'EMPLOYEE' AND ${ids ? ` (cast(additional_info->>'personId' as bigint) NOT IN (${ids}) OR cast(additional_info->>'personId' as bigint) IS NULL) AND ` : ''} deleted_at is null;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getFaceByDssId(dssId: string) {
        const sql = `select id from enrolled_face where additional_info->>'dss_id' = '${dssId}' AND deleted_at is null;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getByPersonId(personId: string) {
        const sql = `select id from enrolled_face where additional_info->>'personId' = '${personId}' AND deleted_at is null;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getFacesByDssIds(dssIds: string) {
        const sql = `select * from enrolled_face where cast(additional_info->>'dss_id' as integer) IN (${dssIds});`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getFacesByPlate(plateNo: string) {
        const sql = `select ef.*, encode(image_thumbnail, 'base64') as image_thumbnail from enrolled_face ef left join face_image fi on ef.id = fi.enrolled_face_id  where additional_info->>'plate_number' = '${plateNo}' AND ef.deleted_at is null AND fi.deleted_at is null;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getFacesByPlateSimilar(plateNo: string, limit: number = 20) {
        if (!plateNo || plateNo.trim() === '') {
            throw new Error('plateNo cannot be empty');
        }

        const sanitized = plateNo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (sanitized.length < 2) {
            throw new Error('plateNo too short, minimum 2 characters');
        }
        const match = sanitized.match(/^([A-Z]{1,2})(\d+)([A-Z]*)$/);

        if (!match) {
            const fallback = `%${sanitized}%`;
            return prisma.$queryRaw(Prisma.sql`
      SELECT 
        ef.*, 
        encode(fi.image_thumbnail, 'base64') AS image_thumbnail
      FROM enrolled_face ef
      LEFT JOIN face_image fi ON ef.id = fi.enrolled_face_id
      WHERE 
        UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${fallback}
        AND UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) != ${sanitized}
        AND ef.additional_info->>'plate_number' IS NOT NULL
        AND ef.deleted_at IS NULL
        AND fi.deleted_at IS NULL
      LIMIT ${limit}
    `);
        }

        const prefix = match[1];   // "B"
        const number = match[2];   // "2176"
        const suffix = match[3];   // "GDN" atau ""

        const hasPrefix = prefix.length > 0;
        const hasSuffix = suffix.length > 0;
        const hasNumber = number.length > 0;

        const patterns: string[] = [];

        if (hasPrefix && hasNumber && hasSuffix) {
            patterns.push(`%${prefix}%${number}%${suffix}%`);  // full match
            patterns.push(`%${prefix}%${number}%`);             // prefix + number
            patterns.push(`%${number}%${suffix}%`);             // number + suffix
            patterns.push(`%${prefix}%${suffix}%`);             // prefix + suffix
        } else if (hasPrefix && hasNumber) {
            patterns.push(`%${prefix}%${number}%`);             // prefix + number
            patterns.push(`%${number}%`);                        // number only
        } else if (hasNumber && hasSuffix) {
            patterns.push(`%${number}%${suffix}%`);             // number + suffix
            patterns.push(`%${number}%`);                        // number only
        }

        // Minimal harus ada 1 pattern
        if (patterns.length === 0) {
            patterns.push(`%${sanitized}%`);
        }
        if (patterns.length === 4) {
            return prisma.$queryRaw(Prisma.sql`
      SELECT 
        ef.*,
        encode(fi.image_thumbnail, 'base64') AS image_thumbnail,
        UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) AS normalized_plate,
        CASE
          WHEN UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[0]} THEN 1
          WHEN UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[1]} THEN 2
          WHEN UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[2]} THEN 3
          WHEN UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[3]} THEN 4
          ELSE 5
        END AS match_rank
      FROM enrolled_face ef
      LEFT JOIN face_image fi ON ef.id = fi.enrolled_face_id
      WHERE
        UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) != ${sanitized}
        AND ef.additional_info->>'plate_number' IS NOT NULL
        AND ef.deleted_at IS NULL
        AND fi.deleted_at IS NULL
        AND (
          UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[0]}
          OR UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[1]}
          OR UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[2]}
          OR UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[3]}
        )
      ORDER BY match_rank ASC
      LIMIT ${limit}
    `);
        }

        if (patterns.length === 2) {
            return prisma.$queryRaw(Prisma.sql`
      SELECT 
        ef.*,
        encode(fi.image_thumbnail, 'base64') AS image_thumbnail,
        UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) AS normalized_plate,
        CASE
          WHEN UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[0]} THEN 1
          WHEN UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[1]} THEN 2
          ELSE 3
        END AS match_rank
      FROM enrolled_face ef
      LEFT JOIN face_image fi ON ef.id = fi.enrolled_face_id
      WHERE
        UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) != ${sanitized}
        AND ef.additional_info->>'plate_number' IS NOT NULL
        AND ef.deleted_at IS NULL
        AND fi.deleted_at IS NULL
        AND (
          UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[0]}
          OR UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[1]}
        )
      ORDER BY match_rank ASC
      LIMIT ${limit}
    `);
        }

        // Fallback: 1 pattern
        return prisma.$queryRaw(Prisma.sql`
    SELECT 
      ef.*,
      encode(fi.image_thumbnail, 'base64') AS image_thumbnail,
      UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) AS normalized_plate
    FROM enrolled_face ef
    LEFT JOIN face_image fi ON ef.id = fi.enrolled_face_id
    WHERE
      UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) != ${sanitized}
      AND ef.additional_info->>'plate_number' IS NOT NULL
      AND ef.deleted_at IS NULL
      AND fi.deleted_at IS NULL
      AND UPPER(REPLACE(ef.additional_info->>'plate_number', ' ', '')) LIKE ${patterns[0]}
    ORDER BY length(ef.additional_info->>'plate_number') ASC
    LIMIT ${limit}
  `);
    }

    static async getCountWithPagination(keyword: String, status: String, startDate: String, endDate: String) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status

        const sql = `SELECT count(id) FROM enrolled_face WHERE ${!status ? ` status != 'EMPLOYEE' ` : status === 'EMPLOYEE' ? ` deleted_at IS NULL AND status = 'EMPLOYEE' ` : ` deleted_at IS ${status === 'out' ? ' NOT ' : ' '} NULL AND status != 'EMPLOYEE' `} ${keyword ? ` AND name ilike '%${keyword}%' ` : ' '} ${startDate ? ` AND created_at >= '${startDate}'` : ''} ${endDate ? ` AND created_at <= '${endDate}'` : ''};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAllWithPagination(keyword: String, status: String, startDate: String, endDate: String, page: number, limit: number) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status

        const sql = `SELECT * FROM enrolled_face WHERE ${!status ? ` status != 'EMPLOYEE' ` : status === 'EMPLOYEE' ? ` deleted_at IS NULL AND status = 'EMPLOYEE' ` : ` deleted_at IS ${status === 'out' ? ' NOT ' : ' '} NULL AND status != 'EMPLOYEE' `} ${keyword ? ` AND name ilike '%${keyword}%' ` : ' '} ${startDate ? ` AND created_at >= '${startDate}'` : ''} ${endDate ? ` AND created_at <= '${endDate}'` : ''} ORDER BY created_at DESC ${limit ? ` LIMIT ${limit} ` : ''} ${limit && page ? ` OFFSET ${limit * (page - 1)} ` : ''};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }
}

