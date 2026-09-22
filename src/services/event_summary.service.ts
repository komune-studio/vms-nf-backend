import EventDAO from "../daos/event.dao";


export default async function buildEventSummary(
    analytic: any,
    streams: string[],
    startDate: any,
    endDate: any
): Promise<any> {
    if (analytic === 'NFV4-VC') {
        const additional: any = {car: 0, motorcycle: 0, bus: 0, truck: 0};

        const rows = await EventDAO.getCountGroupByStatus(analytic, streams, startDate, endDate);

        rows.forEach((row: any) => {
            additional[row.status] = parseInt(row.count);
        });

        return additional;
    }

    if (analytic === 'NFV4-VD') {
        const avg = await EventDAO.getAvg(streams, startDate, endDate);

        return {avg: avg.length > 0 ? avg[0].avg : 0};
    }

    if (analytic === 'NFV4-MPAA') {
        const additional: any = {Male: 0, Female: 0};

        const rows = await EventDAO.getCountGroupByGender(streams, startDate, endDate);

        rows.forEach((row: any) => {
            additional[row.gender] = parseInt(row.count);
        });

        return additional;
    }

    return {};
}
