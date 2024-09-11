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

    static async getCountGroupByTimeAndStatus(streams: String[], analytic: String, startTime : String, endTime : String, interval : number, line : String) {
        if (streams.length === 0) return []

        const sql = `select count(*), ${analytic === 'NFV4-VC' ? ` result->>'label' as status ` : ' status'}, to_timestamp(floor((extract('epoch' from event_time) / ${interval} )) * ${interval}) as interval_alias ${analytic === 'NFV4-CE' ? ` , avg(cast(detection->'pipeline_data'->>'estimation' as int)) ` : ''} ${analytic === 'NFV4-MPAA' ? ` , detection->'pipeline_data'->'attributes'->'gender'->>'label' as gender ` : ''} ${analytic === 'NFV4-VD' ? ` , avg(cast(detection->'pipeline_data'->>'duration' as float)) ` : ''} from event where ${` stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} AND ${analytic === 'NFV4-VC' || analytic === 'NFV4-VD' ? ` type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = '${analytic === 'NFV4-VC' ? 'counting' : 'dwelling'}' ` : ` type = '${analytic}' `}  ${startTime ? ` AND event_time >= '${startTime}' ` : ' '} ${endTime ? ` AND event_time <= '${endTime}' ` : ' '} ${analytic === 'NFV4-MPAA' ? ` AND detection->'pipeline_data'->'attributes'->'gender'->>'label' IS NOT NULL ` : ' '} ${line ? ` AND detection->'pipeline_data'->>'area_name' = '${line}' ` : ' '} GROUP BY ${analytic === 'NFV4-VC' ? ` result->>'label' ` : ' status'}, interval_alias ${analytic === 'NFV4-MPAA' ? ` , gender ` : ''} ORDER BY interval_alias ASC`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountGroupByStatus(analytic : String, stream: String, startTime : String, endTime : String) {
        const sql = `select count(*), ${analytic === 'NFV4-VC' ? ` result->>'label' as status ` : ` status `} from event where stream_id IN ${stream} AND ${analytic === 'NFV4-VC' || analytic === 'NFV4-VD' ? ` type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = '${analytic === 'NFV4-VC' ? 'counting' : 'dwelling'}' ` : ` type = '${analytic}' `}  ${startTime ? ` AND event_time >= '${startTime}' ` : ' '} ${endTime ? ` AND event_time <= '${endTime}' ` : ' '} GROUP BY ${analytic === 'NFV4-VC' ? ` result->>'label' ` : ` status `}`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountGroupByGender(stream: String, startTime : String, endTime : String) {
        const sql = `select count(*), detection->'pipeline_data'->'attributes'->'gender'->>'label' as gender from event where stream_id IN ${stream} AND type = 'NFV4-MPAA' ${startTime ? ` AND event_time >= '${startTime}' ` : ' '} ${endTime ? ` AND event_time <= '${endTime}' ` : ' '}  AND detection->'pipeline_data'->'attributes'->'gender'->>'label' IS NOT NULL GROUP BY gender`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountPeopleAndVehicleGroupByTime(streams: String[], startTime : String, endTime : String, interval : number) {
        if (streams.length === 0) return []

        const sql = `select count(*), type, to_timestamp(floor((extract('epoch' from event_time) / ${interval} )) * ${interval}) as interval_alias from event where ${` stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} ${startTime ? ` AND event_time >= '${startTime}' ` : ' '} ${endTime ? ` AND event_time <= '${endTime}' ` : ' '} AND ((type = 'NFV4-MPAA' AND detection->'pipeline_data'->'attributes'->'gender'->>'label' IS NOT NULL) OR (type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = 'counting'))  GROUP BY interval_alias, type ORDER BY interval_alias ASC`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountGroupLocation(streams: String[], startTime : String, endTime : String, analytic : String) {
        if (streams.length === 0) return []

        const sql = `select count(*) ${analytic === 'NFV4-VD' ? ` , avg(cast(detection->'pipeline_data'->>'duration' as float)) ` : ' '}, stream_id, ${analytic === 'NFV4-VC' ? ` result->>'label' as status ` : ` status `}, stream_id ${analytic === 'NFV4-MPAA' ? ` , detection->'pipeline_data'->'attributes'->'gender'->>'label' as gender ` : ''} from event where ${` stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} ${startTime ? ` AND event_time >= '${startTime}' ` : ' '} ${endTime ? ` AND event_time <= '${endTime}' ` : ' '} AND ${analytic === 'NFV4-VC' || analytic === 'NFV4-VD' ? ` type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = '${analytic === 'NFV4-VC' ? 'counting' : 'dwelling'}' ` : ` type = '${analytic}' `} ${analytic === 'NFV4-MPAA' ? ` AND detection->'pipeline_data'->'attributes'->'gender'->>'label' IS NOT NULL ` : ' '}  GROUP BY stream_id, stream_id, ${analytic === 'NFV4-VC' ? ` result->>'label' ` : ' status '} ${analytic === 'NFV4-MPAA' ? `, gender ` : ''} ORDER BY ${analytic === 'NFV4-VD' ? ` avg ` : ' count '} DESC`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountGroupByStatusAndTimeAndLocation(streams: String[], startTime : String, endTime : String, analytic : String, interval : number) {
        if (streams.length === 0) return []

        const sql = `select count(*) ${analytic === 'NFV4-VD' ? ` , avg(cast(detection->'pipeline_data'->>'duration' as float)), sum(cast(detection->'pipeline_data'->>'duration' as float)) ` : ' '}, stream_id, to_timestamp(floor((extract('epoch' from event_time) / ${interval} )) * ${interval}) as interval_alias, ${analytic === 'NFV4-VC' ? ` result->>'label' as status ` : ' status '} ${analytic === 'NFV4-MPAA' ? ` , detection->'pipeline_data'->'attributes'->'gender'->>'label' as gender ` : ''} from event where ${` stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} ${startTime ? ` AND event_time >= '${startTime}' ` : ' '} ${endTime ? ` AND event_time <= '${endTime}' ` : ' '} AND ${analytic === 'NFV4-VC' || analytic === 'NFV4-VD' ? ` type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = '${analytic === 'NFV4-VC' ? 'counting' : 'dwelling'}' ` : ` type = '${analytic}' `} ${analytic === 'NFV4-MPAA' ? ` AND detection->'pipeline_data'->'attributes'->'gender'->>'label' IS NOT NULL ` : ' '} GROUP BY interval_alias, stream_id, ${analytic === 'NFV4-VC' ? ` result->>'label' ` : ' status '} ${analytic === 'NFV4-MPAA' ? `, gender ` : ''} ORDER BY interval_alias ASC`

        console.log(sql)

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountGroupByTimeAndLocation(streams: String[], startTime : String, endTime : String, analytic : String, interval : number) {
        if (streams.length === 0) return []

        const sql = `select count(*) ${analytic === 'NFV4-VD' ? ` , avg(cast(detection->'pipeline_data'->>'duration' as float)) ` : ' '}, stream_id, to_timestamp(floor((extract('epoch' from event_time) / ${interval} )) * ${interval}) as interval_alias from event where ${` stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} ${startTime ? ` AND event_time >= '${startTime}' ` : ' '} ${endTime ? ` AND event_time <= '${endTime}' ` : ' '} AND type = '${analytic}'  GROUP BY interval_alias, stream_id ORDER BY interval_alias ASC`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAvg(stream: String, startTime : String, endTime : String) {
        const sql = `select avg(cast(detection->'pipeline_data'->>'duration' as float)) from event where stream_id IN ${stream} AND type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = 'dwelling' ${startTime ? ` AND event_time >= '${startTime}' ` : ' '} ${endTime ? ` AND event_time <= '${endTime}' ` : ' '}`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAvgGroupByTime(streams: String[], startTime : String, endTime : String, interval : number) {
        if (streams.length === 0) return []

        const sql = `select count(*), avg(cast(detection->'pipeline_data'->>'duration' as float)), to_timestamp(floor((extract('epoch' from event_time) / ${interval} )) * ${interval}) as interval_alias from event where ${` stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} AND type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = 'dwelling' ${startTime ? ` AND event_time >= '${startTime}' ` : ' '} ${endTime ? ` AND event_time <= '${endTime}' ` : ' '} GROUP BY interval_alias ORDER BY interval_alias ASC`

        console.log(sql)

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAvgGroupByLocation(streams: String[], startTime : String, endTime : String) {
        if (streams.length === 0) return []

        const sql = `select count(*), stream_id, avg(cast(detection->'pipeline_data'->>'duration' as float)) from event where ${` stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} ${startTime ? ` AND event_time >= '${startTime}' ` : ' '} ${endTime ? ` AND event_time <= '${endTime}' ` : ' '} AND type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = 'dwelling'  GROUP BY stream_id ORDER BY avg DESC`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getMaxDuration(streamId: String, startTime : String, endTime : String, line : String) {
        const sql = `SELECT cast(detection->'pipeline_data'->>'duration' as float) as duration, event_time FROM event where cast(detection->'pipeline_data'->>'duration' as float) = (
select max(cast(detection->'pipeline_data'->>'duration' as float)) from event where type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = 'dwelling' AND stream_id = '${streamId}' AND event_time >= '${startTime}' ${endTime ? ` AND event_time <= '${endTime}'` : ''} LIMIT 1
) AND type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = 'dwelling' AND stream_id = '${streamId}' AND event_time >= '${startTime}' ${endTime ? ` AND event_time <= '${endTime}'` : ''} ${line ? ` AND detection->'pipeline_data'->>'area_name' = '${line}' ` : ' '} LIMIT 1;`

        console.log(sql)

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getMinDuration(streamId: String, startTime : String, endTime : string, line : String) {
        const sql = `SELECT cast(detection->'pipeline_data'->>'duration' as float) as duration, event_time FROM event where cast(detection->'pipeline_data'->>'duration' as float) = (
select min(cast(detection->'pipeline_data'->>'duration' as float)) from event where type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = 'dwelling' AND stream_id = '${streamId}' AND event_time >= '${startTime}' ${endTime ? ` AND event_time <= '${endTime}'` : ''} LIMIT 1
)  AND type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = 'dwelling' AND stream_id = '${streamId}' AND event_time >= '${startTime}' ${endTime ? ` AND event_time <= '${endTime}'` : ''} ${line ? ` AND detection->'pipeline_data'->>'area_name' = '${line}' ` : ' '} LIMIT 1;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAvgDuration(streamId: String[], startTime : String, endTime : string, line : String) {
        const sql = `select avg(cast(detection->'pipeline_data'->>'duration' as float)), count(*) total_data from event where type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = 'dwelling' ${streamId ? ` AND stream_id IN (${streamId.map(id => `'${id}'`).join(',')}) ` : ''} AND event_time >= '${startTime}' ${endTime ? ` AND event_time <= '${endTime}'` : ''} ${line ? ` AND detection->'pipeline_data'->>'area_name' = '${line}' ` : ' '}`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getRanking(streams: String[], type : string, startTime : string, endTime : string, interval : string) {
        const sql = `select ${type === 'NFV4-VD' ? " avg(cast(detection->'pipeline_data'->>'duration' as float)), " : " "} count(*), date_trunc('${interval}', event_time AT TIME ZONE 'Asia/Jakarta') as interval_alias,  stream_id from event where ${` stream_id IN (${streams.map(stream => `'${stream}'`).join(',')}) `} AND ${type === 'NFV4-VC' || type === 'NFV4-VD' ? ` type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = '${type === 'NFV4-VC' ? 'counting' : 'dwelling'}' ` : ` type = '${type}' `}  AND event_time >= '${startTime}' ${endTime && endTime !== 'undefined' ? ` AND event_time <= '${endTime}'` : ''}  ${type === 'NFV4-MPAA' ? ` AND detection->'pipeline_data'->'attributes'->'gender'->>'label' IS NOT NULL ` : ' '} group by interval_alias, stream_id  order by ${type === 'NFV4-VD' ? ' avg ' : ' count '} DESC  LIMIT 3  `

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountWithPagination(keyword: String, status: String, stream: String, analytic: String, startDate: String, endDate: String) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status
        // @ts-ignore
        analytic = analytic === 'null' ? null : analytic

        const sql = `SELECT count(id) FROM event WHERE ${status && (analytic === 'NFV4-FR' || analytic === 'NFV4H-FR') ? ` status = '${status}' ` : status && analytic === 'NFV4-LPR2' ? ` result->>'result' ${status === 'UNKNOWN' ? ' not ' : ''} ilike '%-%' ` : ' 1 = 1 '} ${analytic === 'NFV4-VC' || analytic === 'NFV4-VD' ? ` AND type = 'NFV4-MVA' AND detection->'pipeline_data'->>'logic' = '${analytic === 'NFV4-VC' ? 'counting' : 'dwelling'}'` : analytic ? ` AND type = '${analytic}' ` : ''} ${startDate ? ` AND event_time >= '${startDate}'` : ''} ${endDate ? ` AND event_time <= '${endDate}'` : ''} ${stream ? ` AND stream_id in ${stream} ` : ''} ${keyword ? ` AND (result->>'result' ilike '%${keyword}%' OR result->>'label' ilike '%${keyword}%' OR detection->>'stream_name' ilike '%${keyword}%' OR detection->'pipeline_data'->'attributes'->'gender'->>'label' ilike '%${keyword}%')` : ''};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getAllWithPagination(keyword: String, status: String, stream: String, analytic: String, startDate: String, endDate: String, page: number, limit: number) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status
        // @ts-ignore
        analytic = analytic === 'null' ? null : analytic

        const sql = `SELECT id, type, stream_id, detection, ${limit && page ? ` primary_image, secondary_image, ` : ''} result, status, event_time, created_at  FROM event WHERE ${status && (analytic === 'NFV4-FR' || analytic === 'NFV4H-FR') ? ` status = '${status}' ` : status && analytic === 'NFV4-LPR2' ? ` result->>'result' ${status === 'UNKNOWN' ? ' not ' : ''} ilike '%-%' ` : ' 1 = 1 '} ${analytic === 'NFV4-VC' || analytic === 'NFV4-VD' ? ` AND type = 'NFV4-MVA' AND  detection->'pipeline_data'->>'logic' = '${analytic === 'NFV4-VC' ? 'counting' : 'dwelling'}' ` : analytic ? ` AND type = '${analytic}' ` : ''} ${startDate ? ` AND event_time >= '${startDate}'` : ''} ${endDate ? ` AND event_time <= '${endDate}'` : ''} ${stream ? ` AND stream_id IN ${stream} ` : ''} ${keyword ? ` AND (result->>'result' ilike '%${keyword}%' OR result->>'label' ilike '%${keyword}%' OR detection->>'stream_name' ilike '%${keyword}%' OR detection->'pipeline_data'->'attributes'->'gender'->>'label' ilike '%${keyword}%')` : ''} ORDER BY event_time DESC ${limit ? ` LIMIT ${limit} ` : ''} ${limit && page ? ` OFFSET ${limit * (page - 1)} ` : ''};`

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
