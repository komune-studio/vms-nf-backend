import EventDAO from "../daos/event.dao";
import EventAggregateService from "./event_aggregate.service";


export interface EventSummary {
    summary: any;
    total: number | null;
    dataBefore: Date | null;
}

export default async function buildEventSummary(
    analytic: any,
    streams: string[],
    startDate: any,
    endDate: any
): Promise<EventSummary> {
    const summarized = await EventAggregateService.getLabelSummary(analytic, streams, startDate, endDate);
    const labels = summarized?.labels ?? null;
    const dataBefore = summarized?.dataBefore ?? null;
    const total = labels ? labels.reduce((sum, row) => sum + row.count, 0) : null;

    if (analytic === 'NFV4-VC') {
        const additional: any = {car: 0, motorcycle: 0, bus: 0, truck: 0};

        if (labels) {
            labels.forEach(row => {
                additional[String(row.label)] = row.count;
            });

            return {summary: additional, total, dataBefore};
        }

        const rows = await EventDAO.getCountGroupByStatus(analytic, streams, startDate, endDate);

        let count = 0;

        rows.forEach((row: any) => {
            additional[row.status] = parseInt(row.count);
            count += parseInt(row.count);
        });

        return {summary: additional, total: count, dataBefore: null};
    }

    if (analytic === 'NFV4-VD') {
        if (labels) {
            const durationSum = labels.reduce((sum, row) => sum + (row.duration_sum ?? 0), 0);
            const durationCount = labels.reduce((sum, row) => sum + row.duration_count, 0);

            return {summary: {avg: durationCount > 0 ? durationSum / durationCount : null}, total, dataBefore};
        }

        const avg = await EventDAO.getAvg(streams, startDate, endDate);

        return {summary: {avg: avg.length > 0 ? avg[0].avg : 0}, total: null, dataBefore: null};
    }

    if (analytic === 'NFV4-MPAA') {
        const additional: any = {Male: 0, Female: 0};

        if (labels) {
            labels.forEach(row => {
                if (row.label !== null) additional[row.label] = row.count;
            });

            return {summary: additional, total, dataBefore};
        }

        const rows = await EventDAO.getCountGroupByGender(streams, startDate, endDate);

        rows.forEach((row: any) => {
            additional[row.gender] = parseInt(row.count);
        });

        return {summary: additional, total: null, dataBefore: null};
    }

    return {summary: {}, total: null, dataBefore: null};
}
