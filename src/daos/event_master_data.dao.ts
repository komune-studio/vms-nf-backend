import PrismaService from "../services/prisma.service";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const eventMasterData = prisma.event_master_data;

export default class EventMasterDataDAO {

    static async createTable() {
        return prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.event_master_data (
        id                  BIGSERIAL          PRIMARY KEY,
        type                character varying(200)  NOT NULL,
        stream_id           character varying(200)  NOT NULL,
        detection           jsonb                   NOT NULL DEFAULT '{}',
        primary_image       bytea,
        secondary_image     bytea,
        result              jsonb,
        status              character varying(200),
        latitude            double precision   NOT NULL,
        longitude           double precision   NOT NULL,
        event_time          TIMESTAMPTZ,
        created_at          TIMESTAMPTZ DEFAULT NOW(),
        patrol_car_id       BigInt NOT NULL
);`
    }

    static async getCountWithPagination(keyword: String, status: String, stream: String, analytic: String, startDate : String, endDate  : String) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status
        // @ts-ignore
        analytic = analytic === 'null' ? null : analytic

        const sql = `SELECT count(id) FROM event_master_data WHERE ${status && (analytic === 'NFV4-FR' || analytic === 'NFV4H-FR') ? ` status = '${status}' ` : status && analytic === 'NFV4-LPR2' ? ` result->>'result' ${status === 'UNKNOWN' ? ' not ' : ''} ilike '%-%' ` : ' 1 = 1 '} ${analytic ? ` AND type = '${analytic}' ` : ''} ${startDate ? ` AND event_time >= '${startDate}'` : ''} ${endDate ? ` AND event_time <= '${endDate}'` : ''} ${stream ? ` AND stream_id in ${stream} ` : ''} ${keyword ? ` AND (result->>'result' ilike '%${keyword}%' OR result->>'label' ilike '%${keyword}%' OR detection->>'stream_name' ilike '%${keyword}%')` : ''};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAllWithPagination(keyword: String, status: String, stream: String, analytic: String, startDate : String, endDate  : String, page: number, limit: number) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status
        // @ts-ignore
        analytic = analytic === 'null' ? null : analytic

        const sql = `SELECT type, stream_id, detection, primary_image, secondary_image, result, status, event_time, created_at, patrol_cars.name as patrol_car_name  FROM event_master_data LEFT JOIN patrol_cars on patrol_car_id = patrol_cars.id WHERE ${status && (analytic === 'NFV4-FR' || analytic === 'NFV4H-FR') ? ` status = '${status}' ` : status && analytic === 'NFV4-LPR2' ? ` result->>'result' ${status === 'UNKNOWN' ? ' not ' : ''} ilike '%-%' ` : ' 1 = 1 '} ${analytic ? ` AND type = '${analytic}' ` : ''} ${startDate ? ` AND event_time >= '${startDate}'` : ''} ${endDate ? ` AND event_time <= '${endDate}'` : ''} ${stream ? ` AND stream_id IN ${stream} ` : ''} ${keyword ? ` AND (result->>'result' ilike '%${keyword}%' OR result->>'label' ilike '%${keyword}%' OR detection->>'stream_name' ilike '%${keyword}%')` : ''} ORDER BY event_time DESC ${limit ? ` LIMIT ${limit} ` : ''} ${limit && page ? ` OFFSET ${limit * (page - 1)} ` : ''};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async create(obj : any) {
        return eventMasterData.create({
            data: obj
        });
    }
}
