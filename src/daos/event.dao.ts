import PrismaService from "../services/prisma.service"
import moment from "moment/moment";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const event = prisma.event;

export default class EventDAO {
    static async getCount(condition: any) {
        let result = event.aggregate({
            _count: {id: true},
            where: condition
        });

        return result;
    }

    static async getAll(condition: any) {
        let result = event.findMany({
            orderBy: {
                event_time: 'asc'
            },
            select: {event_time: true},
            where: condition
        });

        return result;
    }

    static async getCountGroupByStreamId(condition: any) {
        let result = event.groupBy({
            by: ['stream_id'],
            _count: {id: true},
            where: condition
        });

        return result;
    }

    static async getCountWithPagination(keyword: String, status: String, stream: String, analytic: String, startDate : String, endDate  : String) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status
        // @ts-ignore
        analytic = analytic === 'null' ? null : analytic

        const sql = `SELECT count(id) FROM event WHERE ${status ? ` status = '${status}' ` : ' 1 = 1 '} ${analytic ? ` AND type = '${analytic}' ` : ''} ${startDate ? ` AND event_time >= '${startDate}'` : ''} ${endDate ? ` AND event_time <= '${endDate}'` : ''} ${stream ? ` AND stream_id in ${stream} ` : ''} ${keyword ? ` AND (result->>'result' ilike '%${keyword}%' OR result->>'label' ilike '%${keyword}%' OR detection->>'stream_name' ilike '%${keyword}%')` : ''};`

        console.log(sql)

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAllWithPagination(keyword: String, status: String, stream: String, analytic: String, startDate : String, endDate  : String, page: number, limit: number) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status
        // @ts-ignore
        analytic = analytic === 'null' ? null : analytic

        const sql = `SELECT id, type, stream_id, detection, primary_image, secondary_image, result, status, event_time, created_at  FROM event WHERE ${status ? ` status = '${status}' ` : ' 1 = 1 '} ${analytic ? ` AND type = '${analytic}' ` : ''} ${startDate ? ` AND event_time >= '${startDate}'` : ''} ${endDate ? ` AND event_time <= '${endDate}'` : ''} ${stream ? ` AND stream_id IN ${stream} ` : ''} ${keyword ? ` AND (result->>'result' ilike '%${keyword}%' OR result->>'label' ilike '%${keyword}%' OR detection->>'stream_name' ilike '%${keyword}%')` : ''} ORDER BY event_time DESC LIMIT ${limit} OFFSET ${limit * (page - 1)};`

        console.log(sql)

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getTopVisitors(amount: number) {
        return prisma.$queryRaw<any>`SELECT count(*) AS num_visits, name FROM event LEFT JOIN enrolled_face on detection -> 'pipeline_data' ->> 'face_id' = cast(enrolled_face.face_id as text) WHERE event.status = 'KNOWN' GROUP BY detection -> 'pipeline_data' ->> 'face_id', name ORDER BY num_visits DESC LIMIT ${amount};`
    }

    static async getByFaceId(faceId: string) {
        let result = event.findMany({
            orderBy: {
                event_time: 'desc'
            },
            where: {
                AND: [
                    {
                        status: {equals: 'KNOWN'}
                    },
                    {
                        detection: {
                            path: ['pipeline_data', 'face_id'],
                            equals: faceId
                        }
                    }
                ]

            }
        });

        return result;
    }
}
