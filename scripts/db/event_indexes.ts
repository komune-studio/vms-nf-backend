/// <reference types="node" />
/**
 * Predikat harus sama persis dengan analyticFilter('NFV4-VD') di event.dao.ts supaya planner memakainya.
 * Postgres 12 tidak bisa CREATE INDEX CONCURRENTLY di tabel induk, jadi index dibuat per partisi lalu
 * di-ATTACH ke index induk; partisi baru otomatis mendapat index yang sama.
 */
import 'dotenv/config'
import PrismaService from '../../src/services/prisma.service'

const prisma = PrismaService.getVisionaire()

const PARENT_INDEX = 'event_dwelling_idx'
const COLUMNS = '(event_time, stream_id)'
const PREDICATE = `type = 'NFV4-MVA' AND ((detection -> 'pipeline_data') ->> 'logic') = 'dwelling'`
const SEED_COMMENT = 'vms-seed'

const USAGE = `Usage:
  npm run db:event-indexes                   create on every partition and attach to ${PARENT_INDEX}
  npm run db:event-indexes -- --seed-only    create on seed partitions only (for testing)
  npm run db:event-indexes -- --drop         remove the index
  npm run db:event-indexes -- --help         show this message`

interface Partition {
    name: string
    comment: string | null
}

const listPartitions = () => prisma.$queryRaw<Partition[]>`
    SELECT c.relname AS name, obj_description(c.oid, 'pg_class') AS comment
    FROM pg_inherits i
    JOIN pg_class c ON c.oid = i.inhrelid
    WHERE i.inhparent = 'event'::regclass
    ORDER BY c.relname
`

const childIndexName = (partition: string) => `${partition}_dwelling_idx`

const parentExists = async () => {
    const [row] = await prisma.$queryRaw<{ exists: boolean }[]>`
        SELECT to_regclass(${PARENT_INDEX}) IS NOT NULL AS exists
    `
    return row.exists
}

// Dicari lewat nama, atau lewat keterikatan ke index induk untuk index yang dibuat otomatis oleh Postgres.
const findChildIndex = async (partition: string, hasParent: boolean) => {
    const rows = await prisma.$queryRaw<{ name: string, valid: boolean }[]>`
        SELECT c.relname AS name, x.indisvalid AS valid
        FROM pg_index x
        JOIN pg_class c ON c.oid = x.indexrelid
        WHERE x.indrelid = ${partition}::regclass
          AND (c.relname = ${childIndexName(partition)}
               OR (${hasParent} AND EXISTS (
                   SELECT 1 FROM pg_inherits i
                   WHERE i.inhrelid = x.indexrelid AND i.inhparent = to_regclass(${PARENT_INDEX})
               )))
    `
    return rows[0] ?? null
}

const isAttached = async (index: string) => {
    const [row] = await prisma.$queryRaw<{ attached: boolean }[]>`
        SELECT EXISTS (
            SELECT 1 FROM pg_inherits
            WHERE inhrelid = ${index}::regclass AND inhparent = to_regclass(${PARENT_INDEX})
        ) AS attached
    `
    return row.attached
}

const create = async (seedOnly: boolean) => {
    const partitions = (await listPartitions())
        .filter(partition => !seedOnly || (partition.comment?.startsWith(SEED_COMMENT) ?? false))

    if (!partitions.length) {
        console.log(seedOnly ? 'No seed partitions found.' : 'The event table has no partitions.')
        return
    }

    const hasParent = await parentExists()
    const indexes: string[] = []

    for (const partition of partitions) {
        const existing = await findChildIndex(partition.name, hasParent)

        // CONCURRENTLY yang gagal meninggalkan index INVALID; buang dan buat ulang.
        if (existing && !existing.valid) {
            await prisma.$executeRawUnsafe(`DROP INDEX CONCURRENTLY ${existing.name}`)
            console.log(`${partition.name}: dropped invalid index ${existing.name}`)
        } else if (existing) {
            indexes.push(existing.name)
            console.log(`${partition.name}: already exists (${existing.name})`)
            continue
        }

        const name = childIndexName(partition.name)
        const started = Date.now()

        await prisma.$executeRawUnsafe(`CREATE INDEX CONCURRENTLY ${name} ON ${partition.name} ${COLUMNS} WHERE ${PREDICATE}`)
        indexes.push(name)
        console.log(`${partition.name}: created in ${((Date.now() - started) / 1000).toFixed(1)} s`)
    }

    // Tidak di-attach supaya ikut terhapus saat seed:revert men-DROP partisinya.
    if (seedOnly) return

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS ${PARENT_INDEX} ON ONLY event ${COLUMNS} WHERE ${PREDICATE}`)

    for (const index of indexes) {
        if (await isAttached(index)) continue

        await prisma.$executeRawUnsafe(`ALTER INDEX ${PARENT_INDEX} ATTACH PARTITION ${index}`)
    }

    const [parent] = await prisma.$queryRaw<{ valid: boolean }[]>`
        SELECT indisvalid AS valid FROM pg_index WHERE indexrelid = ${PARENT_INDEX}::regclass
    `

    console.log(parent.valid
        ? `${PARENT_INDEX} is active on ${indexes.length} partitions; new partitions get it automatically.`
        : `${PARENT_INDEX} is not valid yet: some partitions have no index. Run this script again.`)
}

const drop = async () => {
    // Menghapus index induk ikut menghapus semua index partisi yang ter-attach.
    if (await parentExists()) {
        await prisma.$executeRawUnsafe(`DROP INDEX ${PARENT_INDEX}`)
        console.log(`Dropped ${PARENT_INDEX}`)
    }

    for (const partition of await listPartitions()) {
        const existing = await findChildIndex(partition.name, false)
        if (!existing) continue

        await prisma.$executeRawUnsafe(`DROP INDEX CONCURRENTLY ${existing.name}`)
        console.log(`Dropped ${existing.name}`)
    }
}

const main = async () => {
    const args = process.argv.slice(2)
    const unknown = args.filter(arg => !['--drop', '--seed-only', '--help', '-h'].includes(arg))

    try {
        if (args.includes('--help') || args.includes('-h')) console.log(USAGE)
        else if (unknown.length) console.log(`Unknown option: ${unknown.join(' ')}\n\n${USAGE}`)
        else if (args.includes('--drop')) await drop()
        else await create(args.includes('--seed-only'))
    } catch (e: any) {
        console.error(`\nFailed: ${e?.message ?? e}`)
        process.exitCode = 1
    } finally {
        await prisma.$disconnect()
        await PrismaService.getNFV4().$disconnect()
    }
}

main()
