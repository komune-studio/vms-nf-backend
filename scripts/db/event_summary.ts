/// <reference types="node" />
import 'dotenv/config'
import PrismaService from '../../src/services/prisma.service'
import EventSummaryDAO from '../../src/daos/event_summary.dao'

const prisma = PrismaService.getVisionaire()

const DAY_MS = 24 * 3600 * 1000

const USAGE = `Usage:
  npm run db:event-summary                                   create the table and fill it from every event
  npm run db:event-summary -- --from 2026-09-01 --to 2026-09-30   refill only these days (UTC, inclusive)
  npm run db:event-summary -- --drop                         remove the table
  npm run db:event-summary -- --help                         show this message`

const startOfUtcDay = (date: Date) => new Date(Math.floor(date.getTime() / DAY_MS) * DAY_MS)

const parseDay = (value: string | undefined, flag: string) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new Error(`${flag} must be a date like 2026-09-01`)

    return new Date(`${value}T00:00:00Z`)
}

const fill = async (from: Date, to: Date) => {
    const days = Math.round((to.getTime() - from.getTime()) / DAY_MS)
    const started = Date.now()
    let rows = 0

    console.log(`Filling ${days} day(s): ${from.toISOString().slice(0, 10)} to ${new Date(to.getTime() - DAY_MS).toISOString().slice(0, 10)}`)

    for (let day = from; day < to; day = new Date(day.getTime() + DAY_MS)) {
        const next = new Date(day.getTime() + DAY_MS)
        const dayStarted = Date.now()
        const { inserted } = await EventSummaryDAO.refresh(day, next)

        rows += inserted

        if (inserted > 0) {
            console.log(`${day.toISOString().slice(0, 10)}: ${inserted} rows in ${((Date.now() - dayStarted) / 1000).toFixed(1)} s`)
        }
    }

    console.log(`Done: ${rows} summary rows in ${((Date.now() - started) / 1000).toFixed(1)} s`)
}

const create = async (args: string[]) => {
    await EventSummaryDAO.createTable()

    if (args.includes('--from') || args.includes('--to')) {
        const from = parseDay(args[args.indexOf('--from') + 1], '--from')
        const to = new Date(parseDay(args[args.indexOf('--to') + 1], '--to').getTime() + DAY_MS)

        if (to <= from) throw new Error('--to must not be before --from')

        await fill(from, to)
        return
    }

    const bounds = await EventSummaryDAO.getEventTimeBounds()

    if (!bounds.min || !bounds.max) {
        console.log('The event table is empty; created an empty event_summary_hourly.')
        return
    }

    await fill(startOfUtcDay(bounds.min), new Date(startOfUtcDay(bounds.max).getTime() + DAY_MS))
}

const main = async () => {
    const args = process.argv.slice(2)
    const known = ['--drop', '--from', '--to', '--help', '-h']
    const unknown = args.filter((arg, i) => !known.includes(arg) && !['--from', '--to'].includes(args[i - 1]))

    try {
        if (args.includes('--help') || args.includes('-h')) console.log(USAGE)
        else if (unknown.length) console.log(`Unknown option: ${unknown.join(' ')}\n\n${USAGE}`)
        else if (args.includes('--drop')) {
            await EventSummaryDAO.dropTable()
            console.log('Dropped event_summary_hourly')
        }
        else await create(args)
    } catch (e: any) {
        console.error(`\nFailed: ${e?.message ?? e}`)
        process.exitCode = 1
    } finally {
        await prisma.$disconnect()
        await PrismaService.getNFV4().$disconnect()
    }
}

main()
