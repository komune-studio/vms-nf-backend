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
            select: {event_time: true, status: true, detection: true, stream_id: true},
            where: condition
        });

        return result;
    }

    static async getCountGroupByTimeAndStatus(streams: String[], analytic: String) {
        if(streams.length === 0) return []

        const sql = `select count(*), status, to_timestamp(floor((extract('epoch' from event_time) / 3600 )) * 3600) as interval_alias ${analytic === 'NFV4-CE' ? ` , avg(cast(detection->'pipeline_data'->>'estimation' as int)) ` : ''} from event where ${` stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} AND type = '${analytic}' AND event_time >= '${moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z')}' GROUP BY status, interval_alias ORDER BY interval_alias ASC`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountGroupByStreamId(streams: String[], analytic: String) {
        if(streams.length === 0) return []

        const sql = `select count(id), result->>'location' as location from event where ${` stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} AND type = '${analytic}' AND event_time >= '${moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z')}'  group by result->>'location'  order by result->>'location' ASC;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountWithPagination(keyword: String, status: String, stream: String, analytic: String, startDate : String, endDate  : String) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status
        // @ts-ignore
        analytic = analytic === 'null' ? null : analytic

        const sql = `SELECT count(id) FROM event WHERE ${status && (analytic === 'NFV4-FR' || analytic === 'NFV4H-FR') ? ` status = '${status}' ` : status && analytic === 'NFV4-LPR2' ? ` result->>'result' ${status === 'UNKNOWN' ? ' not ' : ''} ilike '%-%' ` : ' 1 = 1 '} ${analytic ? ` AND type = '${analytic}' ` : ''} ${startDate ? ` AND event_time >= '${startDate}'` : ''} ${endDate ? ` AND event_time <= '${endDate}'` : ''} ${stream ? ` AND stream_id in ${stream} ` : ''} ${keyword ? ` AND (result->>'result' ilike '%${keyword}%' OR result->>'label' ilike '%${keyword}%')` : ''};`

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

        const sql = `SELECT id, type, stream_id, detection, primary_image, secondary_image, result, status, event_time, created_at  FROM event WHERE ${status && (analytic === 'NFV4-FR' || analytic === 'NFV4H-FR') ? ` status = '${status}' ` : status && analytic === 'NFV4-LPR2' ? ` result->>'result' ${status === 'UNKNOWN' ? ' not ' : ''} ilike '%-%' ` : ' 1 = 1 '} ${analytic ? ` AND type = '${analytic}' ` : ''} ${startDate ? ` AND event_time >= '${startDate}'` : ''} ${endDate ? ` AND event_time <= '${endDate}'` : ''} ${stream ? ` AND stream_id IN ${stream} ` : ''} ${keyword ? ` AND (result->>'result' ilike '%${keyword}%' OR result->>'label' ilike '%${keyword}%')` : ''} ORDER BY event_time DESC LIMIT ${limit} OFFSET ${limit * (page - 1)};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getTopVisitors(amount: number, streams: String[], startDate? : string, endDate? : string, startTime? : string, endTime? : string, gender? : string, age? : string) {
        const sql = `SELECT count(*) AS num_visits, name FROM event LEFT JOIN enrolled_face on detection -> 'pipeline_data' ->> 'face_id' = cast(enrolled_face.face_id as text) WHERE event.status = 'KNOWN' ${` AND stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} ${gender ? ` AND gender = '${gender}'` : ''} GROUP BY detection -> 'pipeline_data' ->> 'face_id', name ORDER BY num_visits DESC LIMIT ${amount};`

        return prisma.$queryRaw(Prisma.raw(sql))
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

    static async getRecentFace(mode : string, streamId : string) {
        let whereStatusClause = ``

        if(mode === 'AUTHORIZED') {
            whereStatusClause = ` AND visit_event.status = '' `
        } else if(mode === 'UNAUTHORIZED') {
            whereStatusClause = ` AND visit_event.status = 'Unauthorized' `
        } else if(mode === 'BLACKLIST') {
            whereStatusClause = ` AND visit_event.status = 'Blacklist' `
        }  else if(mode === 'UNRECOGNIZED') {
            whereStatusClause = ` AND visit_event.status IS NULL `
        }

        //enrollment only valid in the same day when they register
        const sql = `select * from (select distinct on (event.status, detection->'pipeline_data'->>'face_id') detection, result, visit_event.status, name, encode(secondary_image, 'base64') as image_jpeg, event_time from event LEFT JOIN visit_event on detection->'pipeline_data'->>'event_id' = event_id LEFT JOIN enrolled_face on detection->'pipeline_data'->>'face_id' = cast(face_id as text) where stream_id = '${streamId}' ${whereStatusClause} AND event_time >= '${moment().subtract(2, 'minutes').format("YYYY-MM-DDTHH:mm:ssZ")}' ORDER BY event.status, detection->'pipeline_data'->>'face_id', event_time  DESC) event order by event_time DESC;
`
        return prisma.$queryRaw(Prisma.raw(sql))
    }
}
