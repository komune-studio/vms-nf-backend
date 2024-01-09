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

    static async getCountGroupByTimeAndStatus(streams: String[], analytic: String, startTime : String, endTime : String, interval : number) {
        if (streams.length === 0) return []

        const sql = `select count(*), status, to_timestamp(floor((extract('epoch' from event_time) / ${interval} )) * ${interval}) as interval_alias ${analytic === 'NFV4-CE' ? ` , avg(cast(detection->'pipeline_data'->>'estimation' as int)) ` : ''} ${analytic === 'NFV4-VD' ? ` , avg(cast(detection->'pipeline_data'->>'duration' as float)) ` : ''} from event where ${` stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} AND type = '${analytic}' ${startTime ? ` AND event_time >= '${startTime}' ` : ' '} ${endTime ? ` AND event_time <= '${endTime}' ` : ' '} GROUP BY status, interval_alias ORDER BY interval_alias ASC`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getMaxDuration(streamId: String, startTime : String, endTime : String) {
        const sql = `SELECT cast(detection->'pipeline_data'->>'duration' as float) as duration, event_time FROM event where cast(detection->'pipeline_data'->>'duration' as float) = (
select max(cast(detection->'pipeline_data'->>'duration' as float)) from event where type = 'NFV4-VD' AND stream_id = '${streamId}' AND event_time >= '${startTime}' ${endTime ? ` AND event_time <= '${endTime}'` : ''} LIMIT 1
) AND type = 'NFV4-VD' AND stream_id = '${streamId}' AND event_time >= '${startTime}' ${endTime ? ` AND event_time <= '${endTime}'` : ''} LIMIT 1;`


        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getMinDuration(streamId: String, startTime : String, endTime : string) {
        const sql = `SELECT cast(detection->'pipeline_data'->>'duration' as float) as duration, event_time FROM event where cast(detection->'pipeline_data'->>'duration' as float) = (
select min(cast(detection->'pipeline_data'->>'duration' as float)) from event where type = 'NFV4-VD' AND stream_id = '${streamId}' AND event_time >= '${startTime}' ${endTime ? ` AND event_time <= '${endTime}'` : ''} LIMIT 1
)  AND type = 'NFV4-VD' AND stream_id = '${streamId}' AND event_time >= '${startTime}' ${endTime ? ` AND event_time <= '${endTime}'` : ''} LIMIT 1;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAvgDuration(streamId: String, startTime : String, endTime : string) {
        const sql = `select avg(cast(detection->'pipeline_data'->>'duration' as float)), count(*) total_data from event where type = 'NFV4-VD' AND stream_id = '${streamId}' AND event_time >= '${startTime}' ${endTime ? ` AND event_time <= '${endTime}'` : ''}`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountGroupByStreamId(streams: String[], analytic: String) {
        if (streams.length === 0) return []

        const sql = `select count(id), result->>'location' as location from event where ${` stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} AND type = '${analytic}' AND event_time >= '${moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z')}'  group by result->>'location'  order by result->>'location' ASC;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountWithPagination(keyword: String, status: String, stream: String, analytic: String, startDate: String, endDate: String, logic: String | undefined) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status
        // @ts-ignore
        analytic = analytic === 'null' ? null : analytic


        const sql = `SELECT count(id) FROM event WHERE ${status && (analytic === 'NFV4-FR' || analytic === 'NFV4H-FR') ? ` status = '${status}' ` : status && analytic === 'NFV4-LPR2' ? ` result->>'result' ${status === 'UNKNOWN' ? ' not ' : ''} ilike '%-%' ` : ' 1 = 1 '} ${analytic ? ` AND type = '${analytic}' ` : ''} ${logic ? ` AND detection->'pipeline_data'->>'logic' = '${logic}' ` : ''} ${startDate ? ` AND event_time >= '${startDate}'` : ''} ${endDate ? ` AND event_time <= '${endDate}'` : ''}  ${stream ? ` AND stream_id in ${stream} ` : ''} ${keyword ? ` AND (result->>'result' ilike '%${keyword}%' OR result->>'label' ilike '%${keyword}%' OR detection->>'stream_name' ilike '%${keyword}%')` : ''};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAllWithPagination(keyword: String, status: String, stream: String, analytic: String, startDate: String, endDate: String, logic : string | undefined, page: number, limit: number) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status
        // @ts-ignore
        analytic = analytic === 'null' ? null : analytic

        const sql = `SELECT id, type, stream_id, detection, ${limit && page ? ` primary_image, secondary_image, ` : ''} result, status, event_time, created_at  FROM event WHERE ${status && (analytic === 'NFV4-FR' || analytic === 'NFV4H-FR') ? ` status = '${status}' ` : status && analytic === 'NFV4-LPR2' ? ` result->>'result' ${status === 'UNKNOWN' ? ' not ' : ''} ilike '%-%' ` : ' 1 = 1 '} ${analytic ? ` AND type = '${analytic}' ` : ''} ${logic ? ` AND detection->'pipeline_data'->>'logic' = '${logic}' ` : ''} ${startDate ? ` AND event_time >= '${startDate}'` : ''} ${endDate ? ` AND event_time <= '${endDate}'` : ''} ${stream ? ` AND stream_id IN ${stream} ` : ''} ${keyword ? ` AND (result->>'result' ilike '%${keyword}%' OR result->>'label' ilike '%${keyword}%' OR detection->>'stream_name' ilike '%${keyword}%')` : ''} ORDER BY event_time DESC ${limit ? ` LIMIT ${limit} ` : ''} ${limit && page ? ` OFFSET ${limit * (page - 1)} ` : ''};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getTopVisitors(amount: number, streams: String[]) {
        const sql = `SELECT count(*) AS num_visits, name FROM event LEFT JOIN enrolled_face on detection -> 'pipeline_data' ->> 'face_id' = cast(enrolled_face.face_id as text) WHERE event.status = 'KNOWN' ${` AND stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} GROUP BY detection -> 'pipeline_data' ->> 'face_id', name ORDER BY num_visits DESC LIMIT ${amount};`

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

    static async getByEventId(eventId: string) {
        console.log(eventId)

        let result = event.findFirst({
            where: {
                detection: {
                    path: ['pipeline_data', 'event_id'],
                    equals: eventId
                }
            }
        });

        return result;
    }

    static async getFaceRecognitionSummary(streamId : string, startTime : string) {
        let result = event.groupBy({
            by: ['status'],
            _count: {id: true},
            where: {
                stream_id: streamId,
                event_time: {
                    gte: startTime
                },
                OR: [
                    {type: 'NFV4-FR'},
                    {type: 'NFV4H-FR'}
                ],
            }
        });

        return result;
    }

    static async getLicensePlateRecognitionSummary(streamId : string, startTime : string) {
        const sql = `
SELECT 
    COUNT(CASE WHEN result->>'result' ilike '%-%' then 1 ELSE NULL END) as "KNOWN",
    COUNT(CASE WHEN result->>'result' not ilike '%-%' then 1 ELSE NULL END) as "UNKNOWN"
from event WHERE type = 'NFV4-LPR2' AND stream_id = '${streamId}' AND event_time >= '${startTime}'
`


        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getGeneralAnalyticSummary(analytic: string, streamId : string, startTime : string) {
        let result = event.aggregate({
            _count: {id: true},
            where: {
                type: analytic,
                stream_id: streamId,
                event_time: {
                    gte: startTime
                },
            }
        });

        return result;
    }
}
