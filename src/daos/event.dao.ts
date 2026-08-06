import PrismaService from "../services/prisma.service"
import moment from "moment/moment";
import {Prisma} from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();

// `events` is partitioned by `created_at` and has no primary key, so Prisma marks it
// @@ignore and generates no delegate for it — everything below has to be raw SQL.

// `created_at` is `timestamp without time zone` holding UTC, so any bound coming from
// the API (which carries a local offset) has to be converted before it reaches SQL.
// Keep the column itself bare in the comparison or Postgres can't prune partitions.
const toUtc = (value: any) => moment(value).utc().format('YYYY-MM-DD HH:mm:ss.SSS')

const inStreams = (streams: String[], column: string) => `${column} IN (${streams.map(stream => `'${stream}'`).join(',')})`

// The old `event` table kept a nested `detection` blob and a separate `result` blob.
// `events` stores everything flat in `pipeline_data`, so rebuild both shapes here to
// keep the response contract unchanged. Both fragments assume the `e`/`s` aliases below.
const DETECTION = `jsonb_build_object('pipeline_data', e.pipeline_data, 'stream_name', s.name)`
const RESULT = `jsonb_build_object('result', e.pipeline_data->>'plate_number', 'label', e.pipeline_data->>'label', 'location', e.pipeline_data->>'area_name')`

const EVENT_COLUMNS = `e.id::text AS id, e.analytic_id AS type, e.stream_id, ${DETECTION} AS detection, ${RESULT} AS result, e.jpeg, e.pipeline_data->>'status' AS status, e.created_at AS event_time, e.created_at`

export default class EventDAO {
    static async getCount(streams: String[], analytic: String, startDate: any, endDate: any) {
        if (streams.length === 0) return 0

        const sql = `SELECT count(*) FROM events WHERE ${inStreams(streams, 'stream_id')} AND analytic_id = '${analytic}' AND created_at >= '${toUtc(startDate)}' AND created_at <= '${toUtc(endDate)}';`

        const result = await prisma.$queryRaw(Prisma.raw(sql))

        // @ts-ignore
        return parseInt(result[0].count)
    }

    static async getCountGroupByTimeAndStatus(streams: String[], analytic: String) {
        if(streams.length === 0) return []

        const sql = `select count(*), pipeline_data->>'status' as status, to_timestamp(floor((extract('epoch' from created_at) / 3600 )) * 3600) as interval_alias ${analytic === 'NFV4-CE' ? ` , avg(cast(pipeline_data->>'estimation' as int)) ` : ''} from events where ${inStreams(streams, 'stream_id')} AND analytic_id = '${analytic}' AND created_at >= '${toUtc(moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z'))}' GROUP BY status, interval_alias ORDER BY interval_alias ASC`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getCountGroupByStreamId(streams: String[], analytic: String) {
        if(streams.length === 0) return []

        const sql = `select count(id), pipeline_data->>'area_name' as location from events where ${inStreams(streams, 'stream_id')} AND analytic_id = '${analytic}' AND created_at >= '${toUtc(moment().subtract(29, 'day').format('YYYY-MM-DDT00:00:00Z'))}' group by location order by location ASC;`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    private static buildFilter(keyword: String, status: String, stream: String, analytic: String, startDate: String, endDate: String) {
        return `${status && (analytic === 'NFV4-FR' || analytic === 'NFV4H-FR') ? ` e.pipeline_data->>'status' = '${status}' ` : status && analytic === 'NFV4-LPR2' ? ` e.pipeline_data->>'plate_number' ${status === 'UNKNOWN' ? ' not ' : ''} ilike '%-%' ` : ' 1 = 1 '} ${analytic ? ` AND e.analytic_id = '${analytic}' ` : ''} ${startDate ? ` AND e.created_at >= '${toUtc(startDate)}'` : ''} ${endDate ? ` AND e.created_at <= '${toUtc(endDate)}'` : ''} ${stream ? ` AND e.stream_id IN ${stream} ` : ''} ${keyword ? ` AND (e.pipeline_data->>'plate_number' ilike '%${keyword}%' OR e.pipeline_data->>'label' ilike '%${keyword}%')` : ''}`
    }

    static async getCountWithPagination(keyword: String, status: String, stream: String, analytic: String, startDate : String, endDate  : String) {
        // @ts-ignore
        keyword = keyword === 'null' ? null : keyword
        // @ts-ignore
        status = status === 'null' ? null : status
        // @ts-ignore
        analytic = analytic === 'null' ? null : analytic

        const sql = `SELECT count(e.id) FROM events e WHERE ${EventDAO.buildFilter(keyword, status, stream, analytic, startDate, endDate)};`

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

        const sql = `SELECT ${EVENT_COLUMNS} FROM events e LEFT JOIN streams s ON s.id = e.stream_id WHERE ${EventDAO.buildFilter(keyword, status, stream, analytic, startDate, endDate)} ORDER BY e.created_at DESC LIMIT ${limit} OFFSET ${limit * (page - 1)};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getTopVisitors(amount: number, streams: String[], startDate? : string, endDate? : string, startTime? : string, endTime? : string, gender? : string, age? : string) {
        if(streams.length === 0) return []

        const sql = `SELECT count(*) AS num_visits, name FROM events e LEFT JOIN enrolled_face on e.pipeline_data->>'face_id' = cast(enrolled_face.face_id as text) WHERE e.pipeline_data->>'status' = 'KNOWN' ${` AND ${inStreams(streams, 'e.stream_id')} `} ${gender ? ` AND gender = '${gender}'` : ''} GROUP BY e.pipeline_data->>'face_id', name ORDER BY num_visits DESC LIMIT ${amount};`

        return prisma.$queryRaw(Prisma.raw(sql))
    }

    static async getByFaceId(faceId: string) {
        const sql = `SELECT ${EVENT_COLUMNS} FROM events e LEFT JOIN streams s ON s.id = e.stream_id WHERE e.pipeline_data->>'status' = 'KNOWN' AND e.pipeline_data->>'face_id' = '${faceId}' ORDER BY e.created_at DESC;`

        return prisma.$queryRaw(Prisma.raw(sql))
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
        const sql = `select * from (select distinct on (e.pipeline_data->>'status', e.pipeline_data->>'face_id') ${DETECTION} as detection, ${RESULT} as result, visit_event.status, enrolled_face.name, encode(e.jpeg, 'base64') as image_jpeg, e.created_at as event_time from events e LEFT JOIN streams s ON s.id = e.stream_id LEFT JOIN visit_event on e.pipeline_data->>'event_id' = visit_event.event_id LEFT JOIN enrolled_face on e.pipeline_data->>'face_id' = cast(face_id as text) where e.stream_id = '${streamId}' ${whereStatusClause} AND e.created_at >= '${toUtc(moment().subtract(2, 'minutes'))}' ORDER BY e.pipeline_data->>'status', e.pipeline_data->>'face_id', e.created_at DESC) recent order by event_time DESC;
`
        return prisma.$queryRaw(Prisma.raw(sql))
    }
}