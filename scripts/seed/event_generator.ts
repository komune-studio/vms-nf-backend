import { PrismaClient } from '../../src/prisma/nfvisionaire'

// Penanda baris seed (`<epoch>-5eedXXXX`); dipakai revert untuk memastikan
// partisi yang di-DROP tidak berisi baris asli.
export const SEED_EVENT_ID_PATTERN = '%-5eed%'

export interface SeedLine {
    name: string
    bidirection: boolean
}

export interface SeedStream {
    id: string
    name: string
    address: string
    nodeNum: number
    lines: SeedLine[]
    areas: string[]
    isNew: boolean
}

export interface ImagePool {
    counting: string[]
    dwelling: string[]
}

const HOUR_WEIGHTS_WIB = [
    0.25, 0.18, 0.15, 0.15, 0.25, 0.60, 1.10, 1.60, 1.70, 1.30, 1.10, 1.05,
    1.10, 1.10, 1.10, 1.20, 1.50, 1.80, 1.70, 1.30, 0.95, 0.75, 0.55, 0.40
]

const PEAK_HOUR_UTC = 10

export const buildDayWeights = (days: number) => {
    const weights = Array.from({ length: days }, () => 0.85 + Math.random() * 0.30)
    const highCount = days >= 7 ? 2 : days >= 3 ? 1 : 0

    const highDays = Array.from({ length: days }, (_, i) => i)
        .sort(() => Math.random() - 0.5)
        .slice(0, highCount)

    for (const day of highDays) weights[day] *= 2.0 + Math.random() * 0.6

    return { weights, highDays }
}

export const splitByWeights = (total: number, weights: number[]) => {
    const sum = weights.reduce((a, b) => a + b, 0)
    const counts = weights.map(w => Math.floor(total * w / sum))

    counts[counts.length - 1] += total - counts.reduce((a, b) => a + b, 0)

    return counts
}

const hourCountsUtc = (dayRows: number) => {
    const weightsUtc = Array.from({ length: 24 }, (_, h) => HOUR_WEIGHTS_WIB[(h + 7) % 24])
    const sum = weightsUtc.reduce((a, b) => a + b, 0)
    const counts = weightsUtc.map(w => Math.floor(dayRows * w / sum))

    counts[PEAK_HOUR_UTC] += dayRows - counts.reduce((a, b) => a + b, 0)

    return counts
}

const lineCumulative = (count: number) => {
    const weights = Array.from({ length: count }, (_, i) => 1 / (i + 1))
    const sum = weights.reduce((a, b) => a + b, 0)

    let acc = 0
    const cumulative = weights.map(w => (acc += w / sum))

    // Galat floating point bisa membuat nilai terakhir 0,999... sehingga ada baris tanpa garis.
    if (count > 0) cumulative[count - 1] = 1

    return cumulative
}

export const effectiveVdShare = (stream: SeedStream, vdShare: number) => {
    if (stream.lines.length === 0) return 1
    if (stream.areas.length === 0) return 0

    return vdShare
}

// Bentuk JSON disalin dari event NFV4-MVA asli; baris dibangkitkan di server
// Postgres supaya jutaan baris tidak lewat jaringan.
export const insertDay = async (prisma: PrismaClient, stream: SeedStream, day: Date, dayRows: number, vdShare: number, pool: ImagePool) => {
    // Angka dikirim sebagai teks lalu di-cast di SQL: Prisma mengunci tipe parameter dari
    // nilai JS pertama (0 -> int8), jadi 0.05 berikutnya ditolak ("incorrect binary data format").
    const num = (value: number) => String(value)

    const hourCounts = hourCountsUtc(dayRows).map(num)
    const trackerBase = num(1000 + Math.floor(Math.random() * 4000))
    const lineCum = lineCumulative(stream.lines.length).map(num)

    return prisma.$executeRaw`
        INSERT INTO event (type, stream_id, detection, primary_image, secondary_image, result, status, keyword, event_time, created_at)
        WITH pool AS MATERIALIZED (
            SELECT 'counting' AS kind, p.idx, decode(p.h, 'hex') AS img
            FROM unnest(${pool.counting}::text[]) WITH ORDINALITY AS p(h, idx)
            UNION ALL
            SELECT 'dwelling', p.idx, decode(p.h, 'hex')
            FROM unnest(${pool.dwelling}::text[]) WITH ORDINALITY AS p(h, idx)
        ),
        raw AS MATERIALIZED (
            -- Maks detik 86398 supaya created_at (event_time + lag) tidak masuk partisi hari berikutnya.
            SELECT ${day}::timestamptz
                       + make_interval(secs => (hc.h - 1) * 3600 + floor(random() * CASE WHEN hc.h = 24 THEN 3599 ELSE 3600 END)) AS t,
                   random() AS r_kind, random() AS r_label, random() AS r_color, random() AS r_line,
                   random() AS r_dir, random() AS r_dur1, random() AS r_dur2, random() AS r_img,
                   random() AS r_lag, random() AS r_conf, random() AS r_hex, random() AS r_out
            FROM unnest(${hourCounts}::text[]::int[]) WITH ORDINALITY AS hc(n, h)
            CROSS JOIN LATERAL generate_series(1, hc.n)
        ),
        typed AS MATERIALIZED (
            SELECT raw.*,
                   CASE WHEN raw.r_kind < ${num(vdShare)}::text::float8 THEN 'dwelling' ELSE 'counting' END AS kind,
                   extract(epoch FROM raw.t)::bigint AS epoch,
                   ${trackerBase}::text::bigint + row_number() OVER (ORDER BY raw.t) AS tracker_id
            FROM raw
        ),
        picked AS MATERIALIZED (
            SELECT typed.*,
                   CASE WHEN typed.kind = 'counting' THEN
                       CASE WHEN typed.r_label < 0.52 THEN 'motorcycle'
                            WHEN typed.r_label < 0.98 THEN 'car'
                            WHEN typed.r_label < 0.99 THEN 'bus'
                            ELSE 'truck' END
                   ELSE
                       CASE WHEN typed.r_label < 0.795 THEN 'car'
                            WHEN typed.r_label < 0.985 THEN 'motorcycle'
                            WHEN typed.r_label < 0.996 THEN 'truck'
                            ELSE 'bus' END
                   END AS label,
                   CASE WHEN typed.r_color < 0.75 THEN 'black'
                        WHEN typed.r_color < 0.84 THEN 'white'
                        WHEN typed.r_color < 0.92 THEN 'cyan'
                        WHEN typed.r_color < 0.99 THEN 'blue'
                        WHEN typed.r_color < 0.995 THEN 'purple'
                        ELSE 'yellow' END AS color,
                   CASE WHEN typed.kind = 'counting' THEN (
                       SELECT min(c.i) FROM unnest(${lineCum}::text[]::float8[]) WITH ORDINALITY AS c(cum, i)
                       WHERE c.cum >= typed.r_line
                   ) END AS line_idx,
                   CASE WHEN typed.kind = 'dwelling'
                        THEN (${stream.areas}::text[])[1 + floor(typed.r_line * ${num(stream.areas.length)}::text::int)::int]
                   END AS dwell_area,
                   typed.epoch || '-5eed' || lpad(to_hex(floor(typed.r_hex * 65536)::int), 4, '0') AS event_id,
                   typed.epoch * 1000 + 100 + floor(typed.r_out * 600)::bigint AS time_out_ms,
                   1 + floor(typed.r_img * CASE WHEN typed.kind = 'counting'
                                                THEN ${num(pool.counting.length)}::text::int
                                                ELSE ${num(pool.dwelling.length)}::text::int END)::int AS img_idx
            FROM typed
        ),
        shaped AS (
            SELECT picked.*,
                   CASE WHEN picked.kind = 'counting'
                        THEN (${stream.lines.map(line => line.name)}::text[])[picked.line_idx]
                        ELSE picked.dwell_area END AS area_name,
                   CASE WHEN picked.kind = 'counting'
                             AND (${stream.lines.map(line => String(line.bidirection))}::text[]::boolean[])[picked.line_idx]
                             AND picked.r_dir >= 0.5
                        THEN 'out' ELSE 'in' END AS direction,
                   round(least(60, greatest(0.08,
                       CASE picked.label WHEN 'car' THEN 8.7 WHEN 'motorcycle' THEN 5.3 WHEN 'truck' THEN 12.0 ELSE 15.0 END
                       * exp(0.55 * sqrt(-2 * ln(greatest(picked.r_dur1, 1e-9))) * cos(2 * pi() * picked.r_dur2))
                   ))::numeric, 3)::float8 AS duration
            FROM picked
        ),
        texts AS (
            SELECT shaped.*,
                   CASE WHEN shaped.kind = 'counting' THEN shaped.label ELSE shaped.area_name END AS primary_text,
                   CASE WHEN shaped.kind = 'counting' THEN shaped.direction
                        ELSE to_char(shaped.duration, 'FM9999990.000') || ' s' END AS secondary_text
            FROM shaped
        )
        SELECT 'NFV4-MVA',
               ${stream.id},
               jsonb_build_object(
                   'node_num', ${num(stream.nodeNum)}::text::int,
                   'stream_id', ${stream.id}::text,
                   'timestamp', x.epoch,
                   'analytic_id', 'NFV4-MVA',
                   'stream_name', ${stream.name}::text,
                   'primary_text', x.primary_text,
                   'secondary_text', x.secondary_text,
                   'stream_address', ${stream.address}::text,
                   'pipeline_data', CASE WHEN x.kind = 'counting' THEN
                       jsonb_build_object(
                           'color', x.color,
                           'label', x.label,
                           'logic', 'counting',
                           'event_id', x.event_id,
                           'area_name', x.area_name,
                           'direction', x.direction,
                           'confidence', 0.5 + x.r_conf * 0.49,
                           'tracker_id', x.tracker_id)
                   ELSE
                       jsonb_build_object(
                           'color', x.color,
                           'label', x.label,
                           'logic', 'dwelling',
                           'time_in', x.time_out_ms - round(x.duration * 1000)::bigint,
                           'duration', x.duration,
                           'event_id', x.event_id,
                           'time_out', x.time_out_ms,
                           'area_name', x.area_name,
                           'confidence', 0,
                           'tracker_id', x.tracker_id)
                   END),
               -- Bukan NULL: event.controller.ts memanggil Buffer.from(primary_image).
               ''::bytea,
               p.img,
               jsonb_build_object(
                   'label', x.primary_text,
                   'result', x.secondary_text,
                   'location', ${stream.name}::text,
                   'timestamp', to_char(x.t AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"')),
               NULL,
               to_tsvector('simple', x.primary_text || ' ' || x.secondary_text || ' ' || ${stream.name}::text),
               x.t,
               x.t + make_interval(secs => 0.3 + x.r_lag * 0.9)
        FROM texts x
        JOIN pool p ON p.kind = x.kind AND p.idx = x.img_idx
    `
}

// `realFrom` melewati partisi seed, yang tanggalnya lebih awal dan akan terpindai lebih dulu.
export const loadImagePool = async (prisma: PrismaClient, realFrom: Date): Promise<ImagePool> => {
    const load = async (logic: string) => {
        const rows = await prisma.$queryRaw<{ img: string }[]>`
            SELECT encode(e.secondary_image, 'hex') AS img
            FROM event e
            WHERE e.created_at >= ${realFrom}
              AND e.type = 'NFV4-MVA'
              AND e.detection->'pipeline_data'->>'logic' = ${logic}
              AND length(e.secondary_image) > 0
              AND e.detection->'pipeline_data'->>'event_id' NOT LIKE ${SEED_EVENT_ID_PATTERN}
            LIMIT 300
        `

        return rows.map(row => row.img)
    }

    const counting = await load('counting')
    const dwelling = await load('dwelling')

    return {
        counting: counting.length ? counting : dwelling,
        dwelling: dwelling.length ? dwelling : counting
    }
}
