import EventAggregateService from "./event_aggregate.service";
import StreamDAO from "../daos/stream.dao";


export interface ExportDataColumn {
    key: string
    label: string
    group: string
    type: 'count' | 'duration'
}

export interface ExportData {
    rows: any[]
    columns: ExportDataColumn[]
}

const VEHICLE_LABELS = ['car', 'motorcycle', 'truck', 'bus'];

const capitalize = (value: string): string => value ? value[0].toUpperCase() + value.slice(1) : value;

export default async function buildExportData(analytics: string[], streams: string[], startDate: any, endDate: any): Promise<ExportData> {
    const allStreams = (await StreamDAO.getAll()).filter(stream => streams.includes(stream.id));

    const rows: any[] = allStreams.map(stream => ({
        stream: stream.name,
        stream_id: stream.id
    }));

    const columns: ExportDataColumn[] = [];

    if (analytics.includes('NFV4-VC')) {
        VEHICLE_LABELS.forEach(key => columns.push({
            key,
            label: capitalize(key),
            group: 'Vehicle Counting',
            type: 'count'
        }));

        const response = await EventAggregateService.getCountGroupLocation(streams, startDate, endDate, 'NFV4-VC');

        rows.forEach(row => {
            VEHICLE_LABELS.forEach(key => { row[key] = 0; });

            response.forEach((data: any) => {
                if (row.stream_id === data.stream_id) {
                    row[data.status] = parseInt(data.count);
                }
            });
        });
    }

    if (analytics.includes('NFV4-MPAA')) {
        columns.push(
            {key: 'male', label: 'Male', group: 'People Counting', type: 'count'},
            {key: 'female', label: 'Female', group: 'People Counting', type: 'count'}
        );

        const response = await EventAggregateService.getCountGroupLocation(streams, startDate, endDate, 'NFV4-MPAA');

        rows.forEach(row => {
            row.male = 0;
            row.female = 0;

            response.forEach((data: any) => {
                if (row.stream_id === data.stream_id) {
                    row[data.gender.toLowerCase()] = parseInt(data.count);
                }
            });
        });
    }

    if (analytics.includes('NFV4-PC')) {
        columns.push({key: 'people', label: 'People', group: 'People Counting', type: 'count'});

        const response = await EventAggregateService.getCountGroupLocation(streams, startDate, endDate, 'NFV4-PC');

        rows.forEach(row => {
            row.people = 0;

            response.forEach((data: any) => {
                if (row.stream_id === data.stream_id) {
                    row.people = parseInt(data.count);
                }
            });
        });
    }

    if (analytics.includes('NFV4-VD')) {
        columns.push({key: 'average', label: 'Average', group: 'Vehicle Dwelling', type: 'duration'});

        const response = await EventAggregateService.getCountGroupLocation(streams, startDate, endDate, 'NFV4-VD');

        rows.forEach(row => {
            row.average = 0;

            response.forEach((data: any) => {
                if (row.stream_id === data.stream_id) {
                    row.average = data.avg;
                }
            });
        });
    }

    rows.forEach(row => {
        delete row.stream_id;
    });

    return {rows, columns};
}
