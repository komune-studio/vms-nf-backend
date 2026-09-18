import PrismaService from "../services/prisma.service"
import { Prisma } from "../prisma/nfvisionaire";

const prisma = PrismaService.getVisionaire();
const event = prisma.event;

const FACE_RECOGNITION_TYPES = ['NFV4-FR', 'NFV4H-FR'];

// ---------------------------------------------------------------------------
// Fragmen SQL bersama.
//
// Semua query analitik di bawah memakai alias tabel `e`, jadi fragmen di sini
// bisa dipakai ulang tanpa perlu mengoper nama alias.
//
// Seluruh nilai dinamis dikirim sebagai bind parameter (Prisma.sql), bukan
// hasil interpolasi string (Prisma.raw). Selain menutup celah SQL injection,
// ini membuat teks query tetap sama untuk setiap pemanggilan sehingga Postgres
// bisa memakai ulang prepared statement + rencana eksekusinya. Versi lama
// menghasilkan teks SQL berbeda tiap kombinasi stream/tanggal, jadi tidak
// pernah ada satu pun plan yang bisa dipakai ulang.
// ---------------------------------------------------------------------------

const GENDER = Prisma.sql`e.detection->'pipeline_data'->'attributes'->'gender'->>'label'`

/**
 * Sengaja membandingkan nilai jsonb, bukan `${GENDER} IS NOT NULL` seperti
 * query analitik lainnya. Ini menyalin persis bentuk yang dulu dihasilkan
 * Prisma dari `{ detection: { path: [...], not: '' } }`, dan ketiganya berbeda
 * hasil pada kasus tepi:
 *
 *   label        bentuk ini   IS NOT NULL   ->> <> ''
 *   "Male"       true         true          true
 *   ""           false        true          false
 *   null (JSON)  true         false         -
 *   path absen   -            false         -
 *
 * Bentuk aslinya dipertahankan supaya angka people_count tidak bergeser.
 */
const GENDER_PRESENT = Prisma.sql`(e.detection #> '{pipeline_data,attributes,gender,label}') <> '""'::jsonb`
const DURATION = Prisma.sql`cast(e.detection->'pipeline_data'->>'duration' as float)`
const ESTIMATION = Prisma.sql`cast(e.detection->'pipeline_data'->>'estimation' as int)`
const AREA_NAME = Prisma.sql`e.detection->'pipeline_data'->>'area_name'`
const VEHICLE_LABEL = Prisma.sql`e.result->>'label'`

const where = (conditions: Prisma.Sql[]) => Prisma.join(conditions, ' AND ')

/**
 * `= ANY(array)` dipakai menggantikan `IN ('a','b',...)` supaya jumlah stream
 * tidak mengubah teks query — satu bind parameter untuk berapa pun streamnya.
 */
const streamFilter = (streams: string[]) => Prisma.sql`e.stream_id = ANY(${streams}::text[])`

/**
 * Batas waktu dikirim sebagai objek Date, bukan string yang di-cast
 * `::timestamptz` di dalam SQL.
 *
 * Cast text->timestamptz bersifat STABLE (hasilnya bergantung pada DateStyle
 * dan TimeZone sesi), sehingga Postgres tidak boleh melipatnya jadi konstanta
 * saat planning. Akibatnya estimasi selektivitas rentang waktu jatuh ke nilai
 * default dan planner memilih rencana yang salah. Terukur pada rentang 1 hari
 * (~506k baris): 399 ms memakai cast, 250 ms memakai parameter Date — setara
 * dengan versi lama yang menempelkan literal ke SQL.
 *
 * String tanpa penanda zona waktu diperlakukan sebagai UTC, menyamai perilaku
 * lama ketika literalnya diparse Postgres dengan session TimeZone = UTC.
 */
const timestampParam = (value: string): Prisma.Sql => {
    const normalized = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(value.trim())
        ? value.trim()
        : `${value.trim().replace(' ', 'T')}Z`

    const parsed = new Date(normalized)

    // Kalau formatnya tak dikenali JS, serahkan kembali ke Postgres: lebih
    // lambat, tapi lebih baik daripada diam-diam membuang filter waktunya.
    return Number.isNaN(parsed.getTime()) ? Prisma.sql`${value}::timestamptz` : Prisma.sql`${parsed}`
}

/**
 * Tabel `event` dipartisi RANGE per hari berdasarkan `created_at`, sedangkan
 * seluruh query analitik memfilter `event_time`. Tanpa predikat atas
 * `created_at`, planner tidak punya dasar untuk partition pruning sehingga
 * SETIAP query menyentuh semua partisi yang ada.
 *
 * Kedua kolom diisi oleh pipeline ingest (nilainya bisa mendahului now() di
 * server DB, jadi `created_at` BUKAN berasal dari `DEFAULT now()`), dengan
 * `created_at` selalu setelah `event_time`. Diverifikasi pada ~900k baris:
 * 0 pelanggaran, selisihnya antara 5 milidetik sampai 4,2 detik. Karena itu
 * `event_time >= startTime` selalu mengimplikasikan `created_at >= startTime`,
 * dan predikat turunan ini aman ditambahkan murni untuk memangkas partisi lama.
 *
 * Kalau suatu saat pipeline berubah dan mulai menulis `created_at` lebih awal
 * daripada `event_time`, predikat ini akan membuang baris — jadi invariannya
 * perlu diuji ulang bila skema ingest diubah.
 *
 * Batas atas sengaja TIDAK diturunkan. `created_at <= endTime` hanya benar
 * selama lag insert kecil, sehingga akan ikut membuang baris kalau suatu saat
 * ada backfill data historis. Manfaatnya pun tipis: yang terpangkas hanya
 * partisi terbaru yang isinya masih sedikit.
 */
const eventTimeRange = (startTime?: string | null, endTime?: string | null): Prisma.Sql[] => {
    const conditions: Prisma.Sql[] = []

    if (startTime) {
        const start = timestampParam(startTime)

        conditions.push(Prisma.sql`e.event_time >= ${start}`)
        conditions.push(Prisma.sql`e.created_at >= ${start}`)
    }

    if (endTime) conditions.push(Prisma.sql`e.event_time <= ${timestampParam(endTime)}`)

    return conditions
}

/**
 * 'logic' sengaja ditulis sebagai literal, bukan parameter, supaya predikat
 * partial index pada detection->>'logic' bisa di-match oleh planner.
 */
const analyticFilter = (analytic: string): Prisma.Sql => {
    if (analytic === 'NFV4-VC')
        return Prisma.sql`e.type = 'NFV4-MVA' AND e.detection->'pipeline_data'->>'logic' = 'counting'`

    if (analytic === 'NFV4-VD')
        return Prisma.sql`e.type = 'NFV4-MVA' AND e.detection->'pipeline_data'->>'logic' = 'dwelling'`

    return Prisma.sql`e.type = ${analytic}`
}

const DWELLING = analyticFilter('NFV4-VD')

const timeBucket = (interval: number) =>
    Prisma.sql`to_timestamp(floor(extract('epoch' from e.event_time) / ${interval}::double precision) * ${interval}::double precision)`

/**
 * Kolom yang diekspos sebagai `status`. Dikembalikan sebagai ekspresi (bukan
 * alias) supaya bisa dipakai langsung di GROUP BY: `status` juga nama kolom
 * asli tabel, dan Postgres memenangkan kolom tabel di atas alias output — jadi
 * `GROUP BY status` diam-diam salah grup untuk analitik NFV4-VC.
 */
const statusColumn = (analytic: string) => analytic === 'NFV4-VC' ? VEHICLE_LABEL : Prisma.sql`e.status`

export default class EventDAO {

    /**
     * Menggantikan `event.aggregate({ _count: { id: true } })`.
     *
     * Prisma membungkus setiap aggregate dalam subquery ber-`OFFSET 0`, dan di
     * Postgres `OFFSET 0` adalah optimization fence: subquery tidak bisa
     * di-flatten, sehingga agregasi tak bisa didorong ke parallel worker.
     * Rencananya jadi `Aggregate <- Gather <- Parallel Seq Scan` — ketiga worker
     * mengirim SEMUA baris `id` (362.775 baris pada rentang 1 hari) lewat Gather
     * untuk dihitung satu thread.
     *
     * `count(*)` langsung menghasilkan `Finalize Aggregate <- Partial Aggregate`,
     * di mana tiap worker menghitung bagiannya sendiri dan hanya mengirim satu
     * angka. Terukur 206 ms -> 126 ms untuk rentang 1 hari.
     *
     * Bonus: lewat jalur ini `eventTimeRange` ikut menyumbang predikat
     * `created_at` untuk partition pruning, yang tidak bisa dilakukan lewat
     * query builder Prisma.
     */
    private static async countWhere(conditions: Prisma.Sql[]): Promise<number> {
        const [row] = await prisma.$queryRaw<{ count: bigint }[]>`
            SELECT count(*) AS count
            FROM event e
            WHERE ${where(conditions)}
        `

        // count(*) bertipe bigint; dikembalikan sebagai number supaya pemanggil
        // bisa langsung mengirimnya lewat res.send (JSON.stringify menolak BigInt).
        return Number(row.count)
    }

    static async getPeopleCount(streams: string[], startTime: string, endTime: string) {
        if (streams.length === 0) return 0

        return EventDAO.countWhere([
            streamFilter(streams),
            Prisma.sql`e.type = 'NFV4-MPAA'`,
            GENDER_PRESENT,
            ...eventTimeRange(startTime, endTime)
        ])
    }

    static async getVehicleCount(streams: string[], startTime: string, endTime: string) {
        if (streams.length === 0) return 0

        return EventDAO.countWhere([
            streamFilter(streams),
            analyticFilter('NFV4-VC'),
            ...eventTimeRange(startTime, endTime)
        ])
    }

    static async getAll(condition: any) {
        let result = event.findMany({
            orderBy: {
                event_time: 'asc'
            },
            select: { event_time: true, status: true, detection: true, stream_id: true },
            where: condition
        });

        return result;
    }

    static async getCountGroupByTimeAndStatus(streams: string[], analytic: string, startTime: string, endTime: string, interval: number, line?: string) {
        if (streams.length === 0) return []

        const bucket = timeBucket(interval)

        const columns: Prisma.Sql[] = [Prisma.sql`count(*) AS count`]
        const groups: Prisma.Sql[] = []

        if (analytic !== 'NFV4-VD') {
            const status = statusColumn(analytic)

            columns.push(Prisma.sql`${status} AS status`)
            groups.push(status)
        }

        columns.push(Prisma.sql`${bucket} AS interval_alias`)
        groups.push(Prisma.sql`interval_alias`)

        if (analytic === 'NFV4-CE')
            columns.push(Prisma.sql`avg(${ESTIMATION}) AS avg`)

        if (analytic === 'NFV4-MPAA') {
            columns.push(Prisma.sql`${GENDER} AS gender`)
            groups.push(Prisma.sql`gender`)
        }

        if (analytic === 'NFV4-VD')
            columns.push(Prisma.sql`avg(${DURATION}) AS avg`)

        const conditions: Prisma.Sql[] = [
            streamFilter(streams),
            analyticFilter(analytic),
            ...eventTimeRange(startTime, endTime)
        ]

        if (analytic === 'NFV4-MPAA') conditions.push(Prisma.sql`${GENDER} IS NOT NULL`)
        if (line) conditions.push(Prisma.sql`${AREA_NAME} = ${line}`)

        return prisma.$queryRaw<any[]>`
            SELECT ${Prisma.join(columns, ', ')}
            FROM event e
            WHERE ${where(conditions)}
            GROUP BY ${Prisma.join(groups, ', ')}
            ORDER BY interval_alias ASC
        `
    }

    static async getCountGroupByStatus(analytic: string, streams: string[], startTime: string, endTime: string) {
        if (streams.length === 0) return []

        const status = statusColumn(analytic)

        const conditions: Prisma.Sql[] = [
            streamFilter(streams),
            analyticFilter(analytic),
            ...eventTimeRange(startTime, endTime)
        ]

        return prisma.$queryRaw<any[]>`
            SELECT count(*) AS count, ${status} AS status
            FROM event e
            WHERE ${where(conditions)}
            GROUP BY ${status}
        `
    }

    static async getCountGroupByGender(streams: string[], startTime: string, endTime: string) {
        if (streams.length === 0) return []

        const conditions: Prisma.Sql[] = [
            streamFilter(streams),
            Prisma.sql`e.type = 'NFV4-MPAA'`,
            ...eventTimeRange(startTime, endTime),
            Prisma.sql`${GENDER} IS NOT NULL`
        ]

        return prisma.$queryRaw<any[]>`
            SELECT count(*) AS count, ${GENDER} AS gender
            FROM event e
            WHERE ${where(conditions)}
            GROUP BY gender
        `
    }

    static async getCountPeopleAndVehicleGroupByTime(streams: string[], startTime: string, endTime: string, interval: number) {
        if (streams.length === 0) return []

        const conditions: Prisma.Sql[] = [
            streamFilter(streams),
            ...eventTimeRange(startTime, endTime),
            Prisma.sql`((e.type = 'NFV4-MPAA' AND ${GENDER} IS NOT NULL) OR (${analyticFilter('NFV4-VC')}))`
        ]

        return prisma.$queryRaw<any[]>`
            SELECT count(*) AS count, e.type, ${timeBucket(interval)} AS interval_alias
            FROM event e
            WHERE ${where(conditions)}
            GROUP BY interval_alias, e.type
            ORDER BY interval_alias ASC
        `
    }

    static async getCountGroupLocation(streams: string[], startTime: string, endTime: string, analytic: string) {
        if (streams.length === 0) return []

        const columns: Prisma.Sql[] = [Prisma.sql`count(*) AS count`]
        // stream_id di versi lama terduplikasi di SELECT dan GROUP BY.
        const groups: Prisma.Sql[] = [Prisma.sql`e.stream_id`]

        if (analytic === 'NFV4-VD') columns.push(Prisma.sql`avg(${DURATION}) AS avg`)

        columns.push(Prisma.sql`e.stream_id`)

        if (analytic === 'NFV4-VC' || analytic === 'NFV4-PC') {
            const status = statusColumn(analytic)

            columns.push(Prisma.sql`${status} AS status`)
            groups.push(status)
        }

        if (analytic === 'NFV4-MPAA') {
            columns.push(Prisma.sql`${GENDER} AS gender`)
            groups.push(Prisma.sql`gender`)
        }

        const conditions: Prisma.Sql[] = [
            streamFilter(streams),
            ...eventTimeRange(startTime, endTime),
            analyticFilter(analytic)
        ]

        if (analytic === 'NFV4-MPAA') conditions.push(Prisma.sql`${GENDER} IS NOT NULL`)

        const order = analytic === 'NFV4-VD' ? Prisma.sql`avg` : Prisma.sql`count`

        return prisma.$queryRaw<any[]>`
            SELECT ${Prisma.join(columns, ', ')}
            FROM event e
            WHERE ${where(conditions)}
            GROUP BY ${Prisma.join(groups, ', ')}
            ORDER BY ${order} DESC
        `
    }

    static async getCountGroupByStatusAndTimeAndLocation(streams: string[], startTime: string, endTime: string, analytic: string, interval: number) {
        if (streams.length === 0) return []

        const columns: Prisma.Sql[] = [Prisma.sql`count(*) AS count`]
        const groups: Prisma.Sql[] = [Prisma.sql`interval_alias`, Prisma.sql`e.stream_id`]

        if (analytic === 'NFV4-VD')
            columns.push(Prisma.sql`avg(${DURATION}) AS avg`, Prisma.sql`sum(${DURATION}) AS sum`)

        columns.push(Prisma.sql`e.stream_id`, Prisma.sql`${timeBucket(interval)} AS interval_alias`)

        if (analytic === 'NFV4-VC' || analytic === 'NFV4-PC') {
            const status = statusColumn(analytic)

            columns.push(Prisma.sql`${status} AS status`)
            groups.push(status)
        }

        if (analytic === 'NFV4-MPAA') {
            columns.push(Prisma.sql`${GENDER} AS gender`)
            groups.push(Prisma.sql`gender`)
        }

        const conditions: Prisma.Sql[] = [
            streamFilter(streams),
            ...eventTimeRange(startTime, endTime),
            analyticFilter(analytic)
        ]

        if (analytic === 'NFV4-MPAA') conditions.push(Prisma.sql`${GENDER} IS NOT NULL`)

        return prisma.$queryRaw<any[]>`
            SELECT ${Prisma.join(columns, ', ')}
            FROM event e
            WHERE ${where(conditions)}
            GROUP BY ${Prisma.join(groups, ', ')}
            ORDER BY interval_alias ASC
        `
    }

    static async getCountGroupByTimeAndLocation(streams: string[], startTime: string, endTime: string, analytic: string, interval: number) {
        if (streams.length === 0) return []

        const columns: Prisma.Sql[] = [Prisma.sql`count(*) AS count`]

        if (analytic === 'NFV4-VD') columns.push(Prisma.sql`avg(${DURATION}) AS avg`)

        columns.push(Prisma.sql`e.stream_id`, Prisma.sql`${timeBucket(interval)} AS interval_alias`)

        const conditions: Prisma.Sql[] = [
            streamFilter(streams),
            ...eventTimeRange(startTime, endTime),
            Prisma.sql`e.type = ${analytic}`
        ]

        return prisma.$queryRaw<any[]>`
            SELECT ${Prisma.join(columns, ', ')}
            FROM event e
            WHERE ${where(conditions)}
            GROUP BY interval_alias, e.stream_id
            ORDER BY interval_alias ASC
        `
    }

    static async getAvg(streams: string[], startTime: string, endTime: string) {
        if (streams.length === 0) return []

        const conditions: Prisma.Sql[] = [
            streamFilter(streams),
            DWELLING,
            ...eventTimeRange(startTime, endTime)
        ]

        return prisma.$queryRaw<any[]>`
            SELECT avg(${DURATION}) AS avg
            FROM event e
            WHERE ${where(conditions)}
        `
    }

    static async getAvgGroupByTime(streams: string[], startTime: string, endTime: string, interval: number) {
        if (streams.length === 0) return []

        const conditions: Prisma.Sql[] = [
            streamFilter(streams),
            DWELLING,
            ...eventTimeRange(startTime, endTime)
        ]

        return prisma.$queryRaw<any[]>`
            SELECT count(*) AS count, avg(${DURATION}) AS avg, ${timeBucket(interval)} AS interval_alias
            FROM event e
            WHERE ${where(conditions)}
            GROUP BY interval_alias
            ORDER BY interval_alias ASC
        `
    }

    static async getAvgGroupByLocation(streams: string[], startTime: string, endTime: string) {
        if (streams.length === 0) return []

        const conditions: Prisma.Sql[] = [
            streamFilter(streams),
            ...eventTimeRange(startTime, endTime),
            DWELLING
        ]

        return prisma.$queryRaw<any[]>`
            SELECT count(*) AS count, e.stream_id, avg(${DURATION}) AS avg
            FROM event e
            WHERE ${where(conditions)}
            GROUP BY e.stream_id
            ORDER BY avg DESC
        `
    }

    /**
     * Versi lama mencari nilai ekstrem lewat subquery lalu mencocokkannya lagi
     * di outer query, jadi tabel dipindai dua kali. `ORDER BY ... LIMIT 1` cukup
     * sekali pindai dan bisa memakai index kalau tersedia.
     *
     * Sekalian memperbaiki filter `line`: dulu hanya dipasang di outer query,
     * sementara subquery mencari nilai ekstrem lintas seluruh area. Akibatnya
     * query mengembalikan nol baris setiap kali durasi ekstrem global kebetulan
     * bukan milik area yang diminta.
     */
    private static async getExtremeDuration(order: Prisma.Sql, streamId: string, startTime: string, endTime: string, line: string) {
        const conditions: Prisma.Sql[] = [
            Prisma.sql`e.stream_id = ${streamId}`,
            DWELLING,
            ...eventTimeRange(startTime, endTime)
        ]

        if (line) conditions.push(Prisma.sql`${AREA_NAME} = ${line}`)

        return prisma.$queryRaw<any[]>`
            SELECT ${DURATION} AS duration, e.event_time
            FROM event e
            WHERE ${where(conditions)}
            ORDER BY ${DURATION} ${order}
            LIMIT 1
        `
    }

    static async getMaxDuration(streamId: string, startTime: string, endTime: string, line: string) {
        return EventDAO.getExtremeDuration(Prisma.sql`DESC`, streamId, startTime, endTime, line)
    }

    static async getMinDuration(streamId: string, startTime: string, endTime: string, line: string) {
        return EventDAO.getExtremeDuration(Prisma.sql`ASC`, streamId, startTime, endTime, line)
    }

    static async getAvgDuration(streamId: string[], startTime: string, endTime: string, line: string) {
        const conditions: Prisma.Sql[] = [DWELLING, ...eventTimeRange(startTime, endTime)]

        if (streamId?.length) conditions.push(streamFilter(streamId))
        if (line) conditions.push(Prisma.sql`${AREA_NAME} = ${line}`)

        return prisma.$queryRaw<any[]>`
            SELECT avg(${DURATION}) AS avg, count(*) AS total_data
            FROM event e
            WHERE ${where(conditions)}
        `
    }

    static async getRanking(streams: string[], type: string, startTime: string, endTime: string, interval: string) {
        if (streams.length === 0) return []

        const columns: Prisma.Sql[] = []

        if (type === 'NFV4-VD') columns.push(Prisma.sql`avg(${DURATION}) AS avg`)

        columns.push(
            Prisma.sql`count(*) AS count`,
            Prisma.sql`date_trunc(${interval}, e.event_time AT TIME ZONE 'Asia/Jakarta') AS interval_alias`,
            Prisma.sql`e.stream_id`
        )

        const conditions: Prisma.Sql[] = [
            streamFilter(streams),
            analyticFilter(type),
            ...eventTimeRange(startTime, endTime && endTime !== 'undefined' ? endTime : null)
        ]

        if (type === 'NFV4-MPAA') conditions.push(Prisma.sql`${GENDER} IS NOT NULL`)

        const order = type === 'NFV4-VD' ? Prisma.sql`avg` : Prisma.sql`count`

        return prisma.$queryRaw<any[]>`
            SELECT ${Prisma.join(columns, ', ')}
            FROM event e
            WHERE ${where(conditions)}
            GROUP BY interval_alias, e.stream_id
            ORDER BY ${order} DESC
            LIMIT 3
        `
    }

    /**
     * WHERE bersama untuk kedua query pagination. Sebelumnya kondisinya ditulis
     * dua kali sebagai string terpisah, jadi total_data dan isi halaman bisa
     * ikut berbeda begitu salah satunya diubah.
     */
    private static paginationFilter(keyword: string | null, status: string | null, streams: string[], analytic: string | null, startDate: string, endDate: string): Prisma.Sql[] {
        const conditions: Prisma.Sql[] = []

        if (status && analytic && FACE_RECOGNITION_TYPES.includes(analytic)) {
            conditions.push(Prisma.sql`e.status = ${status}`)
        } else if (status && analytic === 'NFV4-LPR2') {
            conditions.push(status === 'UNKNOWN'
                ? Prisma.sql`e.result->>'result' NOT ILIKE '%-%'`
                : Prisma.sql`e.result->>'result' ILIKE '%-%'`)
        }

        if (analytic) conditions.push(analyticFilter(analytic))

        conditions.push(...eventTimeRange(startDate, endDate))

        if (streams?.length) conditions.push(streamFilter(streams))

        if (keyword) {
            const pattern = `%${keyword}%`

            conditions.push(Prisma.sql`(
                e.result->>'result' ILIKE ${pattern}
                OR e.result->>'label' ILIKE ${pattern}
                OR e.detection->>'stream_name' ILIKE ${pattern}
                OR ${GENDER} ILIKE ${pattern}
            )`)
        }

        // Postgres menolak WHERE kosong; jaga-jaga kalau tidak ada filter sama sekali.
        return conditions.length ? conditions : [Prisma.sql`1 = 1`]
    }

    static async getCountWithPagination(keyword: string | null, status: string | null, streams: string[], analytic: string | null, startDate: string, endDate: string) {
        const conditions = EventDAO.paginationFilter(
            keyword === 'null' ? null : keyword,
            status === 'null' ? null : status,
            streams,
            analytic === 'null' ? null : analytic,
            startDate,
            endDate
        )

        return prisma.$queryRaw<any[]>`
            SELECT count(*) AS count
            FROM event e
            WHERE ${where(conditions)}
        `
    }

    static async getAllWithPagination(keyword: string | null, status: string | null, streams: string[], analytic: string | null, startDate: string, endDate: string, page: number, limit: number) {
        const conditions = EventDAO.paginationFilter(
            keyword === 'null' ? null : keyword,
            status === 'null' ? null : status,
            streams,
            analytic === 'null' ? null : analytic,
            startDate,
            endDate
        )

        // primary_image/secondary_image bertipe bytea dan paling mahal untuk
        // dibaca, jadi hanya diambil pada mode pagination (bukan export CSV).
        const images = limit && page ? Prisma.sql`e.primary_image, e.secondary_image,` : Prisma.empty

        const pagination = limit
            ? Prisma.sql`LIMIT ${limit} OFFSET ${page ? limit * (page - 1) : 0}`
            : Prisma.empty

        return prisma.$queryRaw<any[]>`
            SELECT e.id, e.type, e.stream_id, e.detection, ${images} e.result, e.status, e.event_time, e.created_at
            FROM event e
            WHERE ${where(conditions)}
            ORDER BY e.event_time DESC
            ${pagination}
        `
    }

    /**
     * Agregasi dilakukan lebih dulu, baru hasilnya (maksimal `amount` baris)
     * di-join ke enrolled_face. Versi lama melakukan LEFT JOIN untuk SETIAP
     * baris event yang cocok sebelum di-GROUP BY — join tanpa index atas
     * `detection->'pipeline_data'->>'face_id'` sebanyak jumlah event.
     */
    static async getTopVisitors(amount: number, streams: string[]) {
        if (streams.length === 0) return []

        return prisma.$queryRaw<any[]>`
            SELECT visits.num_visits, ef.name
            FROM (
                SELECT count(*) AS num_visits, e.detection->'pipeline_data'->>'face_id' AS face_id
                FROM event e
                WHERE e.status = 'KNOWN' AND ${streamFilter(streams)}
                GROUP BY e.detection->'pipeline_data'->>'face_id'
                ORDER BY num_visits DESC
                LIMIT ${amount}
            ) visits
            LEFT JOIN enrolled_face ef ON ef.face_id::text = visits.face_id
            ORDER BY visits.num_visits DESC
        `
    }

    static async getByFaceId(faceId: string) {
        let result = event.findMany({
            orderBy: {
                event_time: 'desc'
            },
            where: {
                AND: [
                    {
                        status: { equals: 'KNOWN' }
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

    /**
     * `event_id` berformat `<unix-epoch>-<acak>`, dan prefix epoch-nya PERSIS
     * sama dengan `event_time` — diverifikasi pada 416.602 baris: 0 pelanggaran,
     * selisih minimum dan maksimum sama-sama nol.
     *
     * Tanpa memanfaatkan itu, mencari satu baris berarti memindai seluruh isi
     * setiap partisi. Terukur: 5,3 detik bila barisnya ada di partisi terbaru,
     * 8,6 detik bila event_id-nya tidak ada sama sekali. Dengan menurunkan
     * `event_time` dari prefix, query bisa memakai index `(event_time, status)`
     * sekaligus memangkas partisi — turun ke 0,2 ms.
     *
     * Batas atas `created_at` diberi margin 1 hari, jauh di atas lag ingest yang
     * terukur (5 milidetik sampai 4,2 detik), supaya tetap benar seandainya
     * ingest sempat tertinggal jauh. Kalau format event_id tidak dikenali,
     * predikat turunan ini dilewati dan query kembali memindai penuh: lambat,
     * tapi tetap mengembalikan hasil yang benar.
     */
    static async getByEventId(eventId: string) {
        const conditions: Prisma.Sql[] = [
            Prisma.sql`e.detection->'pipeline_data'->>'event_id' = ${eventId}`
        ]

        const epoch = /^(\d{9,11})-/.exec(eventId ?? '')?.[1]

        if (epoch) {
            const at = new Date(Number(epoch) * 1000)

            conditions.push(
                Prisma.sql`e.event_time = ${at}`,
                Prisma.sql`e.created_at >= ${at}`,
                Prisma.sql`e.created_at < ${at} + interval '1 day'`
            )
        }

        const [row] = await prisma.$queryRaw<any[]>`
            SELECT e.id, e.type, e.stream_id, e.detection, e.primary_image, e.secondary_image,
                   e.result, e.status, e.event_time, e.created_at
            FROM event e
            WHERE ${where(conditions)}
            LIMIT 1
        `

        if (!row) return null

        // id bertipe bigint di DB; findFirst dulu mengembalikannya sebagai number
        // (schema Prisma menyebutnya Int), dan controller mengirim baris ini apa
        // adanya lewat res.send — JSON.stringify menolak BigInt.
        return { ...row, id: Number(row.id) }
    }

    /**
     * Dulu memakai `event.groupBy({ _count: { id: true } })`, yang menghasilkan
     * `SELECT COUNT(id), status ... GROUP BY status OFFSET 0` — sama seperti
     * `countWhere`, `COUNT(id)` plus `OFFSET` menghalangi agregasi didorong ke
     * parallel worker, dan lewat query builder tidak ada cara menyisipkan
     * predikat `created_at` untuk partition pruning.
     *
     * Bentuk kembaliannya juga berubah, dan ini memperbaiki bug: groupBy
     * menghasilkan `{ status, _count: { id } }`, sedangkan pemanggilnya di
     * util.controller.ts membaca `data.count` — yang selalu undefined, sehingga
     * ringkasan face recognition tidak pernah menampilkan angka. Sekarang
     * kolomnya benar-benar bernama `count` dan sudah berupa number.
     */
    static async getFaceRecognitionSummary(streamId: string, startTime: string) {
        const rows = await prisma.$queryRaw<{ status: string, count: bigint }[]>`
            SELECT count(*) AS count, e.status
            FROM event e
            WHERE ${where([
                Prisma.sql`e.stream_id = ${streamId}`,
                Prisma.sql`e.type = ANY(${FACE_RECOGNITION_TYPES}::text[])`,
                ...eventTimeRange(startTime)
            ])}
            GROUP BY e.status
        `

        return rows.map(row => ({ ...row, count: Number(row.count) }))
    }

    static async getLicensePlateRecognitionSummary(streamId: string, startTime: string) {
        return prisma.$queryRaw<any[]>`
            SELECT
                count(*) FILTER (WHERE e.result->>'result' ILIKE '%-%') AS "KNOWN",
                count(*) FILTER (WHERE e.result->>'result' NOT ILIKE '%-%') AS "UNKNOWN"
            FROM event e
            WHERE ${where([
                Prisma.sql`e.type = 'NFV4-LPR2'`,
                Prisma.sql`e.stream_id = ${streamId}`,
                ...eventTimeRange(startTime)
            ])}
        `
    }

    /**
     * CATATAN: method ini tidak dipanggil dari mana pun (sudah dicek di seluruh
     * src/). Tetap dioptimalkan agar konsisten, tapi kandidat kuat untuk dihapus.
     *
     * Bentuk kembaliannya berubah dari `{ _count: { id } }` menjadi number,
     * mengikuti getPeopleCount/getVehicleCount. Aman justru karena belum ada
     * pemanggil yang bisa rusak.
     */
    static async getGeneralAnalyticSummary(analytic: string, streamId: string, startTime: string) {
        return EventDAO.countWhere([
            Prisma.sql`e.type = ${analytic}`,
            Prisma.sql`e.stream_id = ${streamId}`,
            ...eventTimeRange(startTime)
        ])
    }

}
