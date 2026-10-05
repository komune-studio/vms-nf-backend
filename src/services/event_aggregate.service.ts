import EventDAO, { parseTimestamp } from "../daos/event.dao";
import EventSummaryDAO, { SummaryRow, SUMMARIZED_ANALYTICS } from "../daos/event_summary.dao";
import { getSummarizedUntil } from "./event_summary_refresh.service";

const HOUR_MS = 3600 * 1000;

interface Totals {
    count: number;
    duration_sum: number | null;
    duration_count: number;
}

const avgOf = (totals: Totals) => totals.duration_count > 0 ? (totals.duration_sum ?? 0) / totals.duration_count : null;

const descNullsFirst = (a: number | null, b: number | null) => {
    if (a === null || b === null) return a === b ? 0 : a === null ? -1 : 1;
    return b - a;
};

const byIntervalAsc = (a: any, b: any) => a.interval_alias.getTime() - b.interval_alias.getTime();

function rollup<K extends any[]>(rows: Totals[], keyOf: (row: any) => K): { key: K, totals: Totals }[] {
    const groups = new Map<string, { key: K, totals: Totals }>();

    rows.forEach(row => {
        const key = keyOf(row);
        const id = JSON.stringify(key);
        const entry = groups.get(id) ?? { key, totals: { count: 0, duration_sum: null, duration_count: 0 } };

        entry.totals.count += row.count;
        entry.totals.duration_count += row.duration_count;

        if (row.duration_sum !== null) entry.totals.duration_sum = (entry.totals.duration_sum ?? 0) + row.duration_sum;

        groups.set(id, entry);
    });

    return [...groups.values()];
}

async function load(analytic: string, streams: string[], startTime: any, endTime: any, interval: number | null) {
    const summarizedUntil = getSummarizedUntil();

    if (!SUMMARIZED_ANALYTICS.includes(analytic) || !summarizedUntil || !streams?.length || !startTime) return null;

    if (interval !== null && !(interval > 0 && interval % 3600 === 0)) return null;

    const start = parseTimestamp(startTime);
    const end = endTime ? parseTimestamp(endTime) : null;

    if (!start || (endTime && !end)) return null;

    const firstHour = new Date(Math.ceil(start.getTime() / HOUR_MS) * HOUR_MS);
    const lastHour = new Date(Math.min(end ? Math.floor(end.getTime() / HOUR_MS) * HOUR_MS : Infinity, summarizedUntil.getTime()));

    if (firstHour >= lastHour) return null;

    const [hours, head, tail] = await Promise.all([
        EventSummaryDAO.sumHours(analytic, streams, firstHour, lastHour, interval),
        start < firstHour ? EventSummaryDAO.countEvents(analytic, streams, start, firstHour, false, interval) : Promise.resolve([]),
        EventSummaryDAO.countEvents(analytic, streams, lastHour, end, true, interval)
    ]);

    const lastHourWithData = hours.reduce((max, row) => row.last_hour ? Math.max(max, new Date(row.last_hour).getTime()) : max, 0);

    const dataBefore = tail.length > 0 ? null
        : lastHourWithData > 0 ? new Date(lastHourWithData + HOUR_MS)
            : firstHour;

    const rows: SummaryRow[] = rollup([...hours, ...head, ...tail], row => [row.stream_id, row.bucket ? new Date(row.bucket).getTime() : null, row.label])
        .map(({ key, totals }) => ({
            stream_id: key[0],
            bucket: key[1] === null ? null : new Date(key[1]),
            label: key[2],
            ...totals
        }));

    return { rows, dataBefore };
}

export default class EventAggregateService {

    static async getLabelSummary(analytic: string, streams: string[], startTime: any, endTime: any) {
        const loaded = await load(analytic, streams, startTime, endTime, null);

        if (!loaded) return null;

        return {
            labels: rollup(loaded.rows, row => [row.label]).map(({ key, totals }) => ({ label: key[0] as string | null, ...totals })),
            dataBefore: loaded.dataBefore
        };
    }

    static async getVehicleCount(streams: string[], startTime: any, endTime: any) {
        const loaded = await load('NFV4-VC', streams, startTime, endTime, null);

        if (!loaded) return EventDAO.getVehicleCount(streams, startTime, endTime);

        return loaded.rows.reduce((total, row) => total + row.count, 0);
    }

    static async getAvgDuration(streamId: string[], startTime: any, endTime: any, line?: any) {
        const loaded = line ? null : await load('NFV4-VD', streamId, startTime, endTime, null);

        if (!loaded) return EventDAO.getAvgDuration(streamId, startTime, endTime, line);

        const [total] = rollup(loaded.rows, () => []);

        return [{ avg: total ? avgOf(total.totals) : null, total_data: total ? total.totals.count : 0 }];
    }

    static async getCountPeopleAndVehicleGroupByTime(streams: string[], startTime: any, endTime: any, interval: number) {
        const [people, vehicles] = await Promise.all([
            load('NFV4-MPAA', streams, startTime, endTime, interval),
            load('NFV4-VC', streams, startTime, endTime, interval)
        ]);

        if (!people || !vehicles) return EventDAO.getCountPeopleAndVehicleGroupByTime(streams, startTime, endTime, interval);

        return [
            ...rollup(people.rows.filter(row => row.label !== null), row => [row.bucket.getTime()])
                .map(({ key, totals }) => ({ count: totals.count, type: 'NFV4-MPAA', interval_alias: new Date(key[0]) })),
            ...rollup(vehicles.rows, row => [row.bucket.getTime()])
                .map(({ key, totals }) => ({ count: totals.count, type: 'NFV4-MVA', interval_alias: new Date(key[0]) }))
        ].sort(byIntervalAsc);
    }

    static async getCountGroupByStatusAndTimeAndLocation(streams: string[], startTime: any, endTime: any, analytic: string, interval: number) {
        const loaded = await load(analytic, streams, startTime, endTime, interval);

        if (!loaded) return EventDAO.getCountGroupByStatusAndTimeAndLocation(streams, startTime, endTime, analytic, interval);

        if (analytic === 'NFV4-VD') {
            return rollup(loaded.rows, row => [row.stream_id, row.bucket.getTime()])
                .map(({ key, totals }) => ({
                    count: totals.count,
                    avg: avgOf(totals),
                    sum: totals.duration_sum,
                    stream_id: key[0],
                    interval_alias: new Date(key[1])
                }))
                .sort(byIntervalAsc);
        }

        const labelKey = analytic === 'NFV4-MPAA' ? 'gender' : 'status';

        return loaded.rows
            .filter(row => analytic !== 'NFV4-MPAA' || row.label !== null)
            .map(row => ({ count: row.count, stream_id: row.stream_id, interval_alias: row.bucket, [labelKey]: row.label }))
            .sort(byIntervalAsc);
    }

    static async getCountGroupLocation(streams: string[], startTime: any, endTime: any, analytic: string) {
        const loaded = await load(analytic, streams, startTime, endTime, null);

        if (!loaded) return EventDAO.getCountGroupLocation(streams, startTime, endTime, analytic);

        if (analytic === 'NFV4-VD') {
            return rollup(loaded.rows, row => [row.stream_id])
                .map(({ key, totals }) => ({ count: totals.count, avg: avgOf(totals), stream_id: key[0] }))
                .sort((a, b) => descNullsFirst(a.avg, b.avg));
        }

        const labelKey = analytic === 'NFV4-MPAA' ? 'gender' : 'status';

        return loaded.rows
            .filter(row => analytic !== 'NFV4-MPAA' || row.label !== null)
            .map(row => ({ count: row.count, stream_id: row.stream_id, [labelKey]: row.label }))
            .sort((a, b) => b.count - a.count);
    }

    static async getCountGroupByTimeAndStatus(streams: string[], analytic: string, startTime: any, endTime: any, interval: number, line?: any) {
        const loaded = line || analytic === 'NFV4-MPAA' ? null : await load(analytic, streams, startTime, endTime, interval);

        if (!loaded) return EventDAO.getCountGroupByTimeAndStatus(streams, analytic, startTime, endTime, interval, line);

        if (analytic === 'NFV4-VD') {
            return rollup(loaded.rows, row => [row.bucket.getTime()])
                .map(({ key, totals }) => ({ count: totals.count, interval_alias: new Date(key[0]), avg: avgOf(totals) }))
                .sort(byIntervalAsc);
        }

        return rollup(loaded.rows, row => [row.label, row.bucket.getTime()])
            .map(({ key, totals }) => ({ count: totals.count, status: key[0], interval_alias: new Date(key[1]) }))
            .sort(byIntervalAsc);
    }

    static async getAvgGroupByTime(streams: string[], startTime: any, endTime: any, interval: number) {
        const loaded = await load('NFV4-VD', streams, startTime, endTime, interval);

        if (!loaded) return EventDAO.getAvgGroupByTime(streams, startTime, endTime, interval);

        return rollup(loaded.rows, row => [row.bucket.getTime()])
            .map(({ key, totals }) => ({ count: totals.count, avg: avgOf(totals), interval_alias: new Date(key[0]) }))
            .sort(byIntervalAsc);
    }

    static async getAvgGroupByLocation(streams: string[], startTime: any, endTime: any) {
        const loaded = await load('NFV4-VD', streams, startTime, endTime, null);

        if (!loaded) return EventDAO.getAvgGroupByLocation(streams, startTime, endTime);

        return rollup(loaded.rows, row => [row.stream_id])
            .map(({ key, totals }) => ({ count: totals.count, stream_id: key[0], avg: avgOf(totals) }))
            .sort((a, b) => descNullsFirst(a.avg, b.avg));
    }
}
