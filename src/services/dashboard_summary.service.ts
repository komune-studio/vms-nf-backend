import moment from "moment";
import EventDAO from "../daos/event.dao";
import StreamDAO from "../daos/stream.dao";

/**
 * Potongan-potongan agregasi dashboard, dipisah dari
 * UtilController.getDashboardSummary supaya ekspor PDF memakai perhitungan yang
 * sama persis dengan yang ditampilkan di layar.
 *
 * Tiap fungsi di sini menyalin satu mode `fetch` dari endpoint itu.
 */

/** Nama stream ditempelkan ke tiap baris hasil query yang hanya membawa stream_id. */
async function withLocation(rows: any[]): Promise<any[]> {
    const streams = await StreamDAO.getAll();

    rows.forEach(row => {
        streams.forEach(stream => {
            if (row.stream_id === stream.id) {
                row.location = stream.name;
            }
        });
    });

    return rows;
}

export const peopleCount = (streams: string[], startDate: any, endDate: any) =>
    EventDAO.getPeopleCount(streams, startDate, endDate);

/**
 * Tanggal di-normalisasi ulang di sini: URLSearchParams mengubah '+' pada offset
 * zona waktu jadi spasi, dan moment tidak mengenali bentuk itu.
 */
export const vehicleCount = (streams: string[], startDate: any, endDate: any) =>
    EventDAO.getVehicleCount(
        streams,
        moment(String(startDate).replace(' ', '+')).format('YYYY-MM-DDTHH:mm:ssZ'),
        endDate ? moment(String(endDate).replace(' ', '+')).format('YYYY-MM-DDTHH:mm:ssZ') : undefined as any
    );

export async function avgVehicleDwelling(streams: string[], startDate: any, endDate: any): Promise<number> {
    const rows = await EventDAO.getAvgDuration(streams, startDate, endDate, '');

    return rows[0]?.avg || 0;
}

export async function peopleAndVehicleSummary(streams: string[], startDate: any, endDate: any, interval: number): Promise<any> {
    const rows = await EventDAO.getCountPeopleAndVehicleGroupByTime(streams, startDate, endDate, interval);

    const summary: any = {};

    rows.forEach((data: any) => {
        const key = moment(data.interval_alias).format('DD-MM-YYYY HH:mm');

        if (!summary[key]) summary[key] = {'NFV4-MPAA': 0, 'NFV4-MVA': 0};

        summary[key][data.type] = parseInt(data.count);
    });

    return summary;
}

/** Mode `summary` untuk NFV4-PC / NFV4-VC / NFV4-MPAA. */
export async function countingSummary(streams: string[], startDate: any, endDate: any, analytic: string, interval: number): Promise<any> {
    const rows = await withLocation(
        await EventDAO.getCountGroupByStatusAndTimeAndLocation(streams, startDate, endDate, analytic, interval)
    );

    const summary: any = {};
    const summary_location: any = {};

    rows.forEach((data: any) => {
        const key = moment(data.interval_alias).format('DD-MM-YYYY HH:mm');

        if (!summary[key]) {
            if (analytic === 'NFV4-VC') {
                summary[key] = {car: 0, motorcycle: 0, bus: 0, truck: 0};
            } else if (analytic === 'NFV4-MPAA') {
                summary[key] = {Male: 0, Female: 0};
            } else {
                summary[key] = 0;
            }
        }

        if (analytic === 'NFV4-VC') {
            summary[key][data.status] += parseInt(data.count);
        } else if (analytic === 'NFV4-MPAA') {
            summary[key][data.gender] += parseInt(data.count);
        } else {
            summary[key] += parseInt(data.count);
        }

        if (!summary_location[data.location]) summary_location[data.location] = 0;

        summary_location[data.location] += parseInt(data.count);
    });

    return {summary, summary_location};
}

/** Mode `summary` untuk analitik dwelling. */
export async function dwellingSummary(streams: string[], startDate: any, endDate: any, interval: number): Promise<any> {
    const rows = await EventDAO.getAvgGroupByTime(streams, startDate, endDate, interval);

    const summary: any = {};

    rows.forEach((data: any) => {
        const key = moment(data.interval_alias).format('DD-MM-YYYY HH:mm');

        summary[key] = {avg_dwelling_time: data.avg, total_vehicles: parseInt(data.count)};
    });

    return summary;
}

/** Mode `summary_location` untuk analitik dwelling. */
export async function dwellingSummaryLocation(streams: string[], startDate: any, endDate: any): Promise<any> {
    const rows = await withLocation(await EventDAO.getAvgGroupByLocation(streams, startDate, endDate));

    const summary_location: any = {};

    rows.forEach((data: any) => {
        summary_location[data.location] = parseInt(data.count);
    });

    return summary_location;
}

export async function detailedSummaryLocation(streams: string[], startDate: any, endDate: any, analytic: any): Promise<any[]> {
    const rows = await withLocation(await EventDAO.getCountGroupLocation(streams, startDate, endDate, analytic));

    let detailed = rows.map((data: any) => ({...data, count: parseInt(data.count)}));

    // Total per kamera dipakai untuk mengurutkan, bukan sekadar hitungan baris:
    // satu kamera menghasilkan beberapa baris (satu per label/gender).
    const totalPerStream = (data: any) => detailed.reduce((sum: number, value: any) =>
        value.stream_id === data.stream_id && value.location === data.location ? sum + value.count : sum, 0);

    if (analytic === 'NFV4-VC') {
        detailed = detailed.map((data: any) => ({...data, total_vehicles: totalPerStream(data)}));
        detailed.sort((a: any, b: any) => b.total_vehicles - a.total_vehicles);
    }

    if (analytic === 'NFV4-MPAA') {
        detailed = detailed.map((data: any) => ({...data, total_people: totalPerStream(data)}));
        detailed.sort((a: any, b: any) => b.total_people - a.total_people);
    }

    return detailed;
}

export async function heatmapData(streams: string[], startDate: any, endDate: any, analytic: string, interval: number): Promise<any[]> {
    const rows = await EventDAO.getCountGroupByTimeAndStatus(streams, analytic, startDate, endDate, interval);

    return rows.map((data: any) => {
        if (analytic === 'NFV4-VC') {
            return {label: data.status, event_time: data.interval_alias, count: parseInt(data.count)};
        }

        if (analytic === 'NFV4-MPAA') {
            return {label: data.gender, event_time: data.interval_alias, count: parseInt(data.count)};
        }

        return {event_time: data.interval_alias, avg: Math.round(data.avg * 100) / 100};
    });
}
