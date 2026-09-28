import 'dotenv/config'
import readline from 'readline'
import { randomBytes } from 'crypto'
import PrismaService from '../../src/services/prisma.service'
import request from '../../src/utils/api.utils'
import {
    SEED_EVENT_ID_PATTERN,
    SeedLine,
    SeedStream,
    buildDayWeights,
    effectiveVdShare,
    insertDay,
    loadImagePool,
    splitByWeights
} from './event_generator'

const visionaire = PrismaService.getVisionaire()
const nfv4 = PrismaService.getNFV4()

const MIN_ROWS = 10000
const MAX_ROWS = 5000000
const MAX_STREAMS = 2
const DEFAULT_DAYS = 14
const DEFAULT_VD_SHARE = 0.05
const DEFAULT_ADDRESS = '/workspaces/visionaire4/.data/traffic-example.mp4'
const SEED_COMMENT = 'vms-seed'
const BYTES_PER_ROW = 3300
const STREAM_SHARES = [0.6, 0.4]

const USAGE = `Usage:
  npm run seed:events -- --rows <n> (--stream <id> | --new-stream)... [options]
  npm run seed:status
  npm run seed:revert [-- --yes]
  npm run seed:events -- --help

Arguments for the script go after "--"; without it npm reads them as its own options.

Seed options:
  --rows <n>          total rows, ${MIN_ROWS}..${MAX_ROWS} (required)
  --stream <id>       use an existing stream (repeatable)
  --new-stream        create a new stream (repeatable); ${MAX_STREAMS} streams max in total
  --name <name>       name for each --new-stream, in order
  --address <path>    new stream address (default ${DEFAULT_ADDRESS})
  --site <id>         site for new streams (default: first site)
  --node <n>          VisionAIre node for new streams (default 0)
  --no-engine         do not register new streams with VisionAIre
  --days <n>          number of days, 1..60 (default ${DEFAULT_DAYS})
  --end-date <date>   last day, YYYY-MM-DD in UTC (default: day before the earliest event partition)
  --vd-share <0..1>   share of dwelling rows per day (default ${DEFAULT_VD_SHARE})
  --vd-rows <n>       approximate total dwelling rows; overrides --vd-share
  --vd-days <n>       only put dwelling rows on n random days (default: all days)
  --yes               skip confirmation

Example, sparse dwelling (~20k dwelling rows on one day among 2M counting rows):
  npm run seed:events -- --rows 2000000 --new-stream --vd-rows 20000 --vd-days 1`

// is_active false supaya engine tidak menjalankan analitik ini kalau memuat ulang pipeline dari DB.
const NEW_STREAM_CONFIG = {
    sub_analytics: [
        {
            name: 'counting',
            areas: [
                { name: 'Line 1', points: [{ x: 0.05, y: 0.45 }, { x: 0.95, y: 0.42 }], bidirection: true },
                { name: 'Line 2', points: [{ x: 0.10, y: 0.78 }, { x: 0.90, y: 0.75 }], bidirection: false }
            ],
            is_active: false,
            object_confidence_threshold: 0.7
        },
        {
            name: 'dwelling',
            areas: [
                {
                    name: 'Area 1',
                    points: [{ x: 0.02, y: 0.05 }, { x: 0.97, y: 0.05 }, { x: 0.97, y: 0.95 }, { x: 0.02, y: 0.95 }],
                    bidirection: false
                }
            ],
            is_active: false
        }
    ]
}

export interface SeedOptions {
    rows: number
    streamIds: string[]
    newStreams: number
    names: string[]
    address: string
    siteId: number | null
    nodeNum: number
    engine: boolean
    days: number
    endDate: string | null
    vdShare: number
    vdRows: number | null
    vdDays: number | null
    yes: boolean
}

interface Partition {
    name: string
    comment: string | null
    day: Date
}

const DAY_MS = 24 * 60 * 60 * 1000

const ymd = (date: Date) => date.toISOString().slice(0, 10)

const partitionName = (day: Date) => `event_${ymd(day).replace(/-/g, '_')}`

const formatNumber = (value: number) => value.toLocaleString('en-US')

const formatBytes = (bytes: number) => `${(bytes / 1024 ** 3).toFixed(1)} GB`

const describeError = async (e: any): Promise<string> => {
    // api.utils melempar objek Response mentah kalau status bukan 2xx.
    if (e && typeof e.text === 'function') return `HTTP ${e.status}: ${await e.text()}`

    return e?.message ?? String(e)
}

const confirm = async (question: string) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    const answer = await new Promise<string>(resolve => rl.question(`${question} [y/N] `, resolve))

    rl.close()

    return answer.trim().toLowerCase() === 'y'
}

const parseArgs = (argv: string[]): SeedOptions => {
    const options: SeedOptions = {
        rows: 0,
        streamIds: [],
        newStreams: 0,
        names: [],
        address: DEFAULT_ADDRESS,
        siteId: null,
        nodeNum: 0,
        engine: true,
        days: DEFAULT_DAYS,
        endDate: null,
        vdShare: DEFAULT_VD_SHARE,
        vdRows: null,
        vdDays: null,
        yes: false
    }

    for (let i = 0; i < argv.length; i++) {
        const flag = argv[i]
        const value = () => {
            const next = argv[++i]
            if (next === undefined) throw new Error(`${flag} needs a value`)
            return next
        }

        switch (flag) {
            case '--rows': options.rows = Number(value()); break
            case '--stream': options.streamIds.push(value()); break
            case '--new-stream': options.newStreams++; break
            case '--name': options.names.push(value()); break
            case '--address': options.address = value(); break
            case '--site': options.siteId = Number(value()); break
            case '--node': options.nodeNum = Number(value()); break
            case '--no-engine': options.engine = false; break
            case '--days': options.days = Number(value()); break
            case '--end-date': options.endDate = value(); break
            case '--vd-share': options.vdShare = Number(value()); break
            case '--vd-rows': options.vdRows = Number(value()); break
            case '--vd-days': options.vdDays = Number(value()); break
            case '--yes': options.yes = true; break
            default: throw new Error(`Unknown option: ${flag}\n\n${USAGE}`)
        }
    }

    if (!Number.isInteger(options.rows) || options.rows < MIN_ROWS || options.rows > MAX_ROWS)
        throw new Error(`--rows must be an integer between ${formatNumber(MIN_ROWS)} and ${formatNumber(MAX_ROWS)}`)

    const streamCount = options.streamIds.length + options.newStreams
    if (streamCount < 1 || streamCount > MAX_STREAMS)
        throw new Error(`Choose 1 to ${MAX_STREAMS} streams with --stream <id> and/or --new-stream`)

    if (new Set(options.streamIds).size !== options.streamIds.length)
        throw new Error('The same --stream was given twice')

    if (!Number.isInteger(options.days) || options.days < 1 || options.days > 60)
        throw new Error('--days must be an integer between 1 and 60')

    if (options.endDate !== null && !/^\d{4}-\d{2}-\d{2}$/.test(options.endDate))
        throw new Error('--end-date must be YYYY-MM-DD')

    if (!(options.vdShare >= 0 && options.vdShare <= 1))
        throw new Error('--vd-share must be between 0 and 1')

    if (options.vdRows !== null && (!Number.isInteger(options.vdRows) || options.vdRows < 0 || options.vdRows > options.rows))
        throw new Error('--vd-rows must be an integer between 0 and --rows')

    if (options.vdDays !== null && (!Number.isInteger(options.vdDays) || options.vdDays < 1 || options.vdDays > options.days))
        throw new Error('--vd-days must be an integer between 1 and --days')

    if (options.siteId !== null && !Number.isInteger(options.siteId))
        throw new Error('--site must be a numeric id')

    if (!Number.isInteger(options.nodeNum) || options.nodeNum < 0)
        throw new Error('--node must be an integer >= 0')

    return options
}

const listPartitions = async (): Promise<Partition[]> => {
    const rows = await visionaire.$queryRaw<{ name: string, comment: string | null }[]>`
        SELECT c.relname AS name, obj_description(c.oid, 'pg_class') AS comment
        FROM pg_inherits i
        JOIN pg_class c ON c.oid = i.inhrelid
        WHERE i.inhparent = 'event'::regclass
        ORDER BY c.relname
    `

    return rows.flatMap(row => {
        const match = /^event_(\d{4})_(\d{2})_(\d{2})$/.exec(row.name)
        return match ? [{ ...row, day: new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`) }] : []
    })
}

const isSeedPartition = (partition: Partition) => partition.comment?.startsWith(SEED_COMMENT) ?? false

const engineUrl = () => {
    const url = process.env.NF_VISIONAIRE_API_URL
    if (!url) throw new Error('NF_VISIONAIRE_API_URL is not set in .env')
    return url
}

const isKnownByEngine = async (nodeNum: number, id: string) => {
    try {
        await request(`${engineUrl()}/streams/${nodeNum}/${id}`, 'GET')
        return true
    } catch (e) {
        return false
    }
}

// Nama area harus sama dengan konfigurasi pipeline: camera detail memfilter event dengan `area_name = line`.
const loadExistingStream = async (id: string): Promise<SeedStream> => {
    const [stream] = await nfv4.$queryRaw<{ name: string, address: string, node_num: number }[]>`
        SELECT name, address, coalesce(node_num, 0) AS node_num FROM streams WHERE id = ${id}
    `
    if (!stream) throw new Error(`Stream ${id} does not exist in nfv4.streams`)

    const areas = await nfv4.$queryRaw<{ logic: string, name: string, bidirection: boolean }[]>`
        SELECT s.sub->>'name' AS logic,
               a.area->>'name' AS name,
               coalesce((a.area->>'bidirection')::boolean, false) AS bidirection
        FROM pipelines p
        CROSS JOIN LATERAL jsonb_array_elements(p.configs->'sub_analytics') WITH ORDINALITY AS s(sub, s_ord)
        CROSS JOIN LATERAL jsonb_array_elements(s.sub->'areas') WITH ORDINALITY AS a(area, a_ord)
        WHERE p.stream_id = ${id} AND p.analytic_id = 'NFV4-MVA'
        ORDER BY s.s_ord, a.a_ord
    `

    const lines: SeedLine[] = areas
        .filter(area => area.logic === 'counting')
        .map(area => ({ name: area.name, bidirection: area.bidirection }))

    const dwellingAreas = areas.filter(area => area.logic === 'dwelling').map(area => area.name)

    if (lines.length === 0 && dwellingAreas.length === 0)
        throw new Error(`Stream ${id} has no NFV4-MVA pipeline with counting/dwelling areas`)

    const [mapping] = await visionaire.$queryRaw<{ site_id: bigint }[]>`
        SELECT site_id FROM map_site_stream WHERE stream_id = ${id} LIMIT 1
    `

    if (!mapping)
        console.warn(`! Stream ${id} is not assigned to a site; the dashboard will not show it.`)

    if (lines.length === 0)
        console.warn(`! Stream ${id} has no counting sub-analytic; only dwelling (VD) rows will be seeded.`)
    else if (dwellingAreas.length === 0)
        console.warn(`! Stream ${id} has no dwelling sub-analytic; only counting (VC) rows will be seeded.`)

    if (!(await isKnownByEngine(stream.node_num, id)))
        console.warn(`! Stream ${id} is not registered in VisionAIre (${engineUrl()}); camera detail will fail until the engine knows it.`)

    return {
        id,
        name: stream.name,
        address: stream.address,
        nodeNum: stream.node_num,
        lines,
        areas: dwellingAreas,
        isNew: false
    }
}

const resolveSiteId = async (siteId: number | null) => {
    const [site] = siteId === null
        ? await visionaire.$queryRaw<{ id: number, name: string }[]>`
            SELECT id, name FROM site WHERE deleted_at IS NULL ORDER BY id LIMIT 1`
        : await visionaire.$queryRaw<{ id: number, name: string }[]>`
            SELECT id, name FROM site WHERE id = ${String(siteId)}::text::int AND deleted_at IS NULL`

    if (!site) throw new Error(siteId === null ? 'No site exists yet; create one or pass --site' : `Site ${siteId} not found`)

    return site
}

// Stream didaftarkan ke engine seperti CameraCreate.js (camera detail butuh engine mengenalnya),
// tapi pipeline hanya ditulis ke nfv4.pipelines supaya engine tidak menghasilkan event sungguhan.
const createNewStream = async (name: string, options: SeedOptions, siteId: number): Promise<SeedStream> => {
    let id: string

    if (options.engine) {
        try {
            const result = await request(`${engineUrl()}/streams/${options.nodeNum}`, 'POST', {
                stream_name: name,
                stream_address: options.address,
                stream_latitude: 0,
                stream_longitude: 0,
                check_capability: false
            })
            id = result.stream_id
        } catch (e) {
            throw new Error(`Failed to register the stream with VisionAIre: ${await describeError(e)}`)
        }

        if (!id) throw new Error('VisionAIre did not return a stream_id')
    } else {
        id = `5eed${randomBytes(6).toString('hex')}`
    }

    await nfv4.$executeRaw`
        INSERT INTO streams (id, address, name, node_num, latitude, longitude, custom_data)
        VALUES (${id}, ${options.address}, ${name}, ${String(options.nodeNum)}::text::int, 0, 0, '{"active": true, "seed": true}'::jsonb)
        ON CONFLICT (id) DO UPDATE SET custom_data = streams.custom_data || '{"seed": true}'::jsonb
    `

    await nfv4.$executeRaw`
        INSERT INTO pipelines (stream_id, analytic_id, configs)
        VALUES (${id}, 'NFV4-MVA', ${JSON.stringify(NEW_STREAM_CONFIG)}::jsonb)
        ON CONFLICT (stream_id, analytic_id) DO NOTHING
    `

    await visionaire.$executeRaw`
        INSERT INTO map_site_stream (site_id, stream_id) VALUES (${String(siteId)}::text::bigint, ${id})
    `

    const counting = NEW_STREAM_CONFIG.sub_analytics[0]
    const dwelling = NEW_STREAM_CONFIG.sub_analytics[1]

    return {
        id,
        name,
        address: options.address,
        nodeNum: options.nodeNum,
        lines: counting.areas.map(area => ({ name: area.name, bidirection: area.bidirection })),
        areas: dwelling.areas.map(area => area.name),
        isNew: true
    }
}

// DDL partisi mengunci tabel induk `event`; gagal cepat daripada ikut memblokir ingest.
const lockedDdl = async (...statements: string[]) => {
    await visionaire.$transaction([
        visionaire.$executeRawUnsafe(`SET LOCAL lock_timeout = '10s'`),
        ...statements.map(statement => visionaire.$executeRawUnsafe(statement))
    ])
}

const dwellingShares = (dayRows: number[], dwellingDays: Set<number>, options: SeedOptions, streamTotal: number) => {
    if (options.vdRows === null)
        return dayRows.map((_, d) => dwellingDays.has(d) ? options.vdShare : 0)

    const target = options.vdRows * streamTotal / options.rows
    const available = dayRows.reduce((sum, rows, d) => dwellingDays.has(d) ? sum + rows : sum, 0)
    const share = available ? Math.min(1, target / available) : 0

    return dayRows.map((_, d) => dwellingDays.has(d) ? share : 0)
}

export const seed = async (options: SeedOptions) => {
    const existing: SeedStream[] = []
    for (const id of options.streamIds) existing.push(await loadExistingStream(id))

    const site = options.newStreams > 0 ? await resolveSiteId(options.siteId) : null

    const partitions = await listPartitions()
    const realPartitions = partitions.filter(partition => !isSeedPartition(partition))

    const endDay = options.endDate
        ? new Date(`${options.endDate}T00:00:00Z`)
        : partitions.length
            ? new Date(partitions[0].day.getTime() - DAY_MS)
            : new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate() - 1))

    if (Number.isNaN(endDay.getTime())) throw new Error(`Invalid --end-date: ${options.endDate}`)

    const days = Array.from({ length: options.days }, (_, i) => new Date(endDay.getTime() - (options.days - 1 - i) * DAY_MS))
    const existingNames = new Set(partitions.map(partition => partition.name))
    const taken = days.map(partitionName).filter(name => existingNames.has(name))

    if (taken.length)
        throw new Error(`These partitions already exist, pick another range (--end-date/--days): ${taken.join(', ')}`)

    if (!realPartitions.length) throw new Error('The event table has no real data to take sample images from')

    const pool = await loadImagePool(visionaire, realPartitions[0].day)
    if (!pool.counting.length) throw new Error('No real NFV4-MVA crops found in the event table to use as secondary_image')

    const [db] = await visionaire.$queryRaw<{ db: string, host: string | null }[]>`
        SELECT current_database() AS db, inet_server_addr()::text AS host
    `

    const newNames = Array.from({ length: options.newStreams }, (_, i) => options.names[i] ?? `Seed Traffic ${i + 1}`)
    const streamCount = existing.length + newNames.length
    const streamRows = streamCount === 1 ? [options.rows] : splitByWeights(options.rows, STREAM_SHARES)

    const { weights, highDays } = buildDayWeights(options.days)
    const perStreamDay = streamRows.map(rows => splitByWeights(rows, weights))

    const dwellingDays = new Set(options.vdDays === null
        ? days.map((_, i) => i)
        : days.map((_, i) => i).sort(() => Math.random() - 0.5).slice(0, options.vdDays))

    const dwellingPlan = options.vdRows !== null
        ? `~${formatNumber(options.vdRows)} rows`
        : `${options.vdShare} of each day`

    console.log('\nSeed plan')
    console.log(`  Database     : ${db.db} @ ${db.host ?? 'local'}`)
    console.log(`  Range        : ${ymd(days[0])} .. ${ymd(days[days.length - 1])} (${options.days} days, UTC)`)
    console.log(`  Total rows   : ${formatNumber(options.rows)} (estimated disk ${formatBytes(options.rows * BYTES_PER_ROW)})`)
    existing.forEach((stream, i) =>
        console.log(`  Stream ${i + 1}     : ${stream.id} "${stream.name}" (existing) -> ${formatNumber(streamRows[i])} rows`))
    newNames.forEach((name, i) =>
        console.log(`  Stream ${existing.length + i + 1}     : NEW "${name}" in site "${site?.name}"${options.engine ? ', registered with VisionAIre' : ', DB only (--no-engine)'} -> ${formatNumber(streamRows[existing.length + i])} rows`))
    console.log(`  Dwelling     : ${dwellingPlan}, on ${dwellingDays.size === days.length ? 'all days' : [...dwellingDays].sort((a, b) => a - b).map(i => ymd(days[i])).join(', ')}`)
    console.log(`  Busy days    : ${highDays.map(i => ymd(days[i])).join(', ') || '-'}`)
    console.log(`  Sample images: ${pool.counting.length} counting crops, ${pool.dwelling.length} dwelling crops\n`)

    if (!options.yes && !(await confirm('Continue?'))) {
        console.log('Cancelled.')
        return
    }

    const streams = [...existing]
    for (const name of newNames) {
        const stream = await createNewStream(name, options, site!.id)
        console.log(`Created stream: ${stream.id} "${stream.name}"`)
        streams.push(stream)
    }

    // Partisi dibuat di transaksi terpisah dari INSERT supaya lock tabel induk tidak tertahan selama insert.
    const createdAt = new Date().toISOString()
    for (const day of days) {
        const name = partitionName(day)
        const next = ymd(new Date(day.getTime() + DAY_MS))
        const comment = `${SEED_COMMENT} streams=${streams.map(stream => stream.id).join(',')} created=${createdAt}`

        await lockedDdl(
            `CREATE TABLE ${name} PARTITION OF event FOR VALUES FROM ('${ymd(day)} 00:00:00+00') TO ('${next} 00:00:00+00')`,
            `COMMENT ON TABLE ${name} IS '${comment}'`
        )
    }

    const vdShares = streams.map((_, s) => dwellingShares(perStreamDay[s], dwellingDays, options, streamRows[s]))
    const started = Date.now()
    let done = 0

    for (let d = 0; d < days.length; d++) {
        for (let s = 0; s < streams.length; s++) {
            const inserted = await insertDay(visionaire, streams[s], days[d], perStreamDay[s][d], effectiveVdShare(streams[s], vdShares[s][d]), pool)
            done += inserted
        }

        const elapsed = (Date.now() - started) / 1000
        console.log(`${ymd(days[d])}: ${formatNumber(done)} / ${formatNumber(options.rows)} (${elapsed.toFixed(0)} s)`)
    }

    for (const day of days) await visionaire.$executeRawUnsafe(`ANALYZE ${partitionName(day)}`)

    console.log(`\nDone: ${formatNumber(done)} rows in ${((Date.now() - started) / 1000).toFixed(0)} s.`)
    console.log(`Open the dashboard with range ${ymd(days[0])} .. ${ymd(days[days.length - 1])} for streams: ${streams.map(stream => stream.id).join(', ')}`)
    console.log('Remove it with: npm run seed:revert')
}

const findSeedStreams = () => nfv4.$queryRaw<{ id: string, name: string, node_num: number, created_at: Date }[]>`
    SELECT id, name, coalesce(node_num, 0) AS node_num, created_at
    FROM streams
    WHERE custom_data->>'seed' = 'true'
    ORDER BY created_at
`

export const status = async () => {
    const seedPartitions = (await listPartitions()).filter(isSeedPartition)
    let totalRows = 0
    let totalBytes = 0

    console.log(`Seed partitions: ${seedPartitions.length}`)
    for (const partition of seedPartitions) {
        const [row] = await visionaire.$queryRawUnsafe<{ count: bigint, bytes: bigint }[]>(
            `SELECT count(*) AS count, pg_total_relation_size('${partition.name}') AS bytes FROM ${partition.name}`
        )

        totalRows += Number(row.count)
        totalBytes += Number(row.bytes)
        console.log(`  ${partition.name}  ${formatNumber(Number(row.count)).padStart(10)} rows  ${formatBytes(Number(row.bytes))}`)
    }
    console.log(`  Total: ${formatNumber(totalRows)} rows, ${formatBytes(totalBytes)}`)

    const streams = await findSeedStreams()
    console.log(`\nSeed streams (created with --new-stream): ${streams.length}`)
    streams.forEach(stream => console.log(`  ${stream.id} "${stream.name}" node ${stream.node_num}`))
}

export const revert = async (yes: boolean) => {
    const seedPartitions = (await listPartitions()).filter(isSeedPartition)
    const streams = await findSeedStreams()

    if (!seedPartitions.length && !streams.length) {
        console.log('No seed data found.')
        return
    }

    console.log(`To delete: ${seedPartitions.length} seed partitions (${seedPartitions.map(p => p.name).join(', ') || '-'})`)
    console.log(`           ${streams.length} seed streams (${streams.map(s => s.id).join(', ') || '-'})`)

    if (!yes && !(await confirm('Continue with revert?'))) {
        console.log('Cancelled.')
        return
    }

    let skipped = 0

    for (const partition of seedPartitions) {
        // Partisi hanya di-DROP kalau semua barisnya bertanda seed.
        const [row] = await visionaire.$queryRawUnsafe<{ count: bigint }[]>(
            `SELECT count(*) AS count FROM ${partition.name}
             WHERE coalesce(detection->'pipeline_data'->>'event_id', '') NOT LIKE $1`,
            SEED_EVENT_ID_PATTERN
        )

        if (Number(row.count) > 0) {
            skipped++
            console.warn(`! ${partition.name} has ${formatNumber(Number(row.count))} non-seed rows; NOT dropped. Check it manually.`)
            continue
        }

        await lockedDdl(`DROP TABLE ${partition.name}`)
        console.log(`Dropped ${partition.name}`)
    }

    if (streams.length) {
        const ids = streams.map(stream => stream.id)

        for (const stream of streams) {
            try {
                await request(`${engineUrl()}/streams/${stream.node_num}/${stream.id}`, 'DELETE')
                console.log(`Sent delete for stream ${stream.id} to VisionAIre`)
            } catch (e) {
                console.log(`Stream ${stream.id} was not deleted from VisionAIre (${await describeError(e)})`)
            }
        }

        // Event stream seed yang sempat masuk ke partisi asli, mis. kalau engine ternyata menjalankan analitiknya.
        const since = streams[0].created_at
        const events = await visionaire.$executeRaw`
            DELETE FROM event WHERE stream_id = ANY(${ids}::text[]) AND created_at >= ${since}
        `
        const mappings = await visionaire.$executeRaw`DELETE FROM map_site_stream WHERE stream_id = ANY(${ids}::text[])`
        const resolutions = await visionaire.$executeRaw`DELETE FROM camera_resolution WHERE stream_id = ANY(${ids}::text[])`
        const pipelines = await nfv4.$executeRaw`DELETE FROM pipelines WHERE stream_id = ANY(${ids}::text[])`
        const deleted = await nfv4.$executeRaw`
            DELETE FROM streams WHERE id = ANY(${ids}::text[]) AND custom_data->>'seed' = 'true'
        `

        console.log(`Deleted seed streams: ${deleted} streams, ${pipelines} pipelines, ${mappings} map_site_stream, ${resolutions} camera_resolution, ${events} events in real partitions`)
    }

    console.log(skipped ? `Revert finished; ${skipped} partitions skipped.` : 'Revert finished.')
}

const main = async () => {
    const [command, ...args] = process.argv.slice(2)
    const wantsHelp = args.includes('--help') || args.includes('-h')

    try {
        if (wantsHelp || (command === 'seed' && args.length === 0)) console.log(USAGE)
        else if (command === 'seed') await seed(parseArgs(args))
        else if (command === 'status') await status()
        else if (command === 'revert') await revert(args.includes('--yes'))
        else console.log(USAGE)
    } catch (e) {
        console.error(`\nFailed: ${await describeError(e)}`)
        process.exitCode = 1
    } finally {
        await visionaire.$disconnect()
        await nfv4.$disconnect()
    }
}

if (require.main === module) main()
