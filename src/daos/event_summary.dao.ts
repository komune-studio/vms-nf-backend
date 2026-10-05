import PrismaService from "../services/prisma.service";
import { Prisma } from "../prisma/nfvisionaire";
import { analyticFilter, timeBucket } from "./event.dao";

const prisma = PrismaService.getVisionaire();

const REFRESH_LOCK_KEY = 74120931;

const LOGIC = Prisma.sql`e.detection->'pipeline_data'->>'logic'`

const ANALYTIC = Prisma.sql`CASE
    WHEN e.type = 'NFV4-MPAA' THEN 'NFV4-MPAA'
    WHEN ${LOGIC} = 'counting' THEN 'NFV4-VC'
    ELSE 'NFV4-VD'
END`

const LABEL = Prisma.sql`CASE
    WHEN e.type = 'NFV4-MPAA' THEN e.detection->'pipeline_data'->'attributes'->'gender'->>'label'
    WHEN ${LOGIC} = 'counting' THEN e.result->>'label'
END`

const DURATION = Prisma.sql`CASE
    WHEN e.type = 'NFV4-MVA' AND ${LOGIC} = 'dwelling' THEN cast(e.detection->'pipeline_data'->>'duration' as float)
END`

const SUMMARIZED = Prisma.sql`(e.type = 'NFV4-MPAA' OR (e.type = 'NFV4-MVA' AND ${LOGIC} IN ('counting', 'dwelling')))`

export const SUMMARIZED_ANALYTICS = ['NFV4-VC', 'NFV4-VD', 'NFV4-MPAA'];

export interface SummaryRow {
    stream_id: string;
    bucket: Date | null;
    label: string | null;
    count: number;
    duration_sum: number | null;
    duration_count: number;
    last_hour?: Date | null;
}

const bucketOf = (interval: number | null, column?: Prisma.Sql) =>
    interval ? timeBucket(interval, column) : Prisma.sql`NULL::timestamptz`

export default class EventSummaryDAO {

    static async createTable() {
        await prisma.$executeRaw`CREATE TABLE IF NOT EXISTS public.event_summary_hourly (
        analytic       varchar(20)  NOT NULL,
        stream_id      varchar(200) NOT NULL,
        hour           timestamptz  NOT NULL,
        label          text,
        count          bigint       NOT NULL,
        duration_sum   double precision,
        duration_count bigint,
        refreshed_at   timestamptz  NOT NULL DEFAULT now()
);`

        await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS event_summary_hourly_lookup_idx
        ON public.event_summary_hourly (analytic, stream_id, hour)`
    }

    static async dropTable() {
        return prisma.$executeRaw`DROP TABLE IF EXISTS public.event_summary_hourly`
    }

    // from dan to harus tepat di awal jam.
    static async refresh(from: Date, to: Date) {
        const [, deleted, inserted] = await prisma.$transaction([
            prisma.$executeRaw`SELECT pg_advisory_xact_lock(${REFRESH_LOCK_KEY})`,
            prisma.$executeRaw`DELETE FROM public.event_summary_hourly WHERE hour >= ${from} AND hour < ${to}`,
            prisma.$executeRaw`
                INSERT INTO public.event_summary_hourly (analytic, stream_id, hour, label, count, duration_sum, duration_count)
                SELECT s.analytic, s.stream_id, s.hour, s.label, count(*), sum(s.duration), count(s.duration)
                FROM (
                    SELECT ${ANALYTIC} AS analytic,
                           e.stream_id,
                           date_trunc('hour', e.event_time AT TIME ZONE 'UTC') AT TIME ZONE 'UTC' AS hour,
                           ${LABEL} AS label,
                           ${DURATION} AS duration
                    FROM event e
                    WHERE e.event_time >= ${from}
                      AND e.created_at >= ${from}
                      AND e.event_time < ${to}
                      AND ${SUMMARIZED}
                ) s
                GROUP BY s.analytic, s.stream_id, s.hour, s.label
            `
        ]);

        return { deleted, inserted };
    }

    static async getEventTimeBounds() {
        const [row] = await prisma.$queryRaw<{ min: Date | null, max: Date | null }[]>`
            SELECT min(e.event_time) AS min, max(e.event_time) AS max FROM event e
        `

        return row;
    }

    static async getLatestHour(): Promise<Date | null> {
        const [row] = await prisma.$queryRaw<{ max: Date | null }[]>`
            SELECT max(hour) AS max FROM public.event_summary_hourly
        `

        return row.max;
    }

    static async sumHours(analytic: string, streams: string[], fromHour: Date, toHour: Date, interval: number | null) {
        return prisma.$queryRaw<SummaryRow[]>`
            SELECT stream_id, ${bucketOf(interval, Prisma.sql`hour`)} AS bucket, label,
                   sum(count)::float8 AS count, sum(duration_sum) AS duration_sum,
                   coalesce(sum(duration_count), 0)::float8 AS duration_count, max(hour) AS last_hour
            FROM public.event_summary_hourly
            WHERE analytic = ${analytic}
              AND stream_id = ANY(${streams}::text[])
              AND hour >= ${fromHour}
              AND hour < ${toHour}
            GROUP BY 1, 2, 3
        `
    }

    // to null berarti tanpa batas atas.
    static async countEvents(analytic: string, streams: string[], from: Date, to: Date | null, endInclusive: boolean, interval: number | null) {
        const upper = !to ? Prisma.sql`TRUE`
            : endInclusive ? Prisma.sql`e.event_time <= ${to}` : Prisma.sql`e.event_time < ${to}`

        return prisma.$queryRaw<SummaryRow[]>`
            SELECT e.stream_id, ${bucketOf(interval)} AS bucket, ${LABEL} AS label,
                   count(*)::float8 AS count, sum(${DURATION}) AS duration_sum, count(${DURATION})::float8 AS duration_count
            FROM event e
            WHERE e.stream_id = ANY(${streams}::text[])
              AND ${analyticFilter(analytic)}
              AND e.event_time >= ${from}
              AND e.created_at >= ${from}
              AND ${upper}
            GROUP BY 1, 2, 3
        `
    }
}
