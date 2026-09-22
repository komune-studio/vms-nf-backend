import moment from "moment";
import EventDAO from "../daos/event.dao";



export interface CameraDetailSummaryRequest {
    analytic_id: string
    stream_id: string
    time: string
    interval?: any
    start_time?: any
    end_time?: any
    line?: any
}

export interface CameraDetailWindow {
    startTime: string
    endTime: string | null
    interval: number
}

export function resolveCameraDetailWindow(request: CameraDetailSummaryRequest): CameraDetailWindow {
    let interval: any = request.interval;

    if (interval && !isNaN(parseInt(interval))) {
        interval = parseInt(interval);
    } else {
        interval = 3600;
    }

    let startTime = moment();
    let endTime: string | null = null;

    if (request.time === 'this_week') {
        startTime = moment().startOf('isoWeeks');
        endTime = moment().subtract(2, 'days').endOf('isoWeeks').format('YYYY-MM-DDT23:59:59Z');
    } else if (request.time === 'this_month') {
        startTime = moment().startOf('month');
    } else if (request.time === 'custom') {
        startTime = moment(request.start_time);
        endTime = moment(request.end_time).format('YYYY-MM-DDTHH:mm:59Z');
    }

    return {
        startTime: startTime.format(request.time === 'custom' ? 'YYYY-MM-DDTHH:mm:00Z' : 'YYYY-MM-DDT00:00:00Z'),
        endTime,
        interval
    };
}

export default async function buildCameraDetailSummary(request: CameraDetailSummaryRequest): Promise<any> {
    const {analytic_id, stream_id, line} = request;
    const {startTime, endTime, interval} = resolveCameraDetailWindow(request);

    const ranking: any = {};
    let result: any = {};

    if (analytic_id === 'NFV4-FR' || analytic_id === 'NFV4H-FR') {
        result = {KNOWN: 0, UNKNOWN: 0};

        // @ts-ignore
        const response = await EventDAO.getFaceRecognitionSummary(stream_id, startTime);

        response.forEach(data => {
            // @ts-ignore
            result[data.status] = data.count;
        });
    } else if (analytic_id === 'NFV4-LPR2') {
        result = {KNOWN: 0, UNKNOWN: 0};

        // @ts-ignore
        const response = await EventDAO.getLicensePlateRecognitionSummary(stream_id, startTime);

        if (response.length > 0) {
            if (response[0].KNOWN) {
                result['KNOWN'] = parseInt(response[0].KNOWN);
            }

            if (response[0].UNKNOWN) {
                result['UNKNOWN'] = parseInt(response[0].UNKNOWN);
            }
        }
    } else if (analytic_id === 'NFV4-VC') {
        result = {car: 0, motorcycle: 0, truck: 0, bus: 0, heatmap_data: []};

        // @ts-ignore
        const response = await EventDAO.getCountGroupByTimeAndStatus([stream_id], analytic_id, startTime, endTime, interval, line);

        response.forEach(data => {
            if (!ranking[data.interval_alias]) {
                ranking[data.interval_alias] = parseInt(data.count);
            } else {
                ranking[data.interval_alias] += parseInt(data.count);
            }

            result[data.status] += parseInt(data.count);
            result.heatmap_data.push({
                label: data.status,
                event_time: data.interval_alias,
                count: parseInt(data.count)
            });
        });

        //only return top 3 ranking
        result.ranking = Object.fromEntries(
            Object.entries(ranking)   // @ts-ignore
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
        );
    } else if (analytic_id === 'NFV4-MPAA') {
        result = {Male: 0, Female: 0, heatmap_data: []};

        // @ts-ignore
        const response = await EventDAO.getCountGroupByTimeAndStatus([stream_id], analytic_id, startTime, endTime, interval, line);

        response.forEach(data => {
            if (!ranking[data.interval_alias]) {
                ranking[data.interval_alias] = parseInt(data.count);
            } else {
                ranking[data.interval_alias] += parseInt(data.count);
            }

            result[data.gender] += parseInt(data.count);
            result.heatmap_data.push({
                label: data.gender,
                event_time: data.interval_alias,
                count: parseInt(data.count)
            });
        });

        //only return top 3 ranking
        result.ranking = Object.fromEntries(
            Object.entries(ranking)   // @ts-ignore
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
        );
    } else if (analytic_id === 'NFV4-VD') {
        result = {max: {}, min: {}, avg: 0, total_data: 0, heatmap_data: []};

        // @ts-ignore
        const response = await EventDAO.getCountGroupByTimeAndStatus([stream_id], analytic_id, startTime, endTime, interval, line);
        // @ts-ignore
        const avgDurationResponse = await EventDAO.getAvgDuration([stream_id], startTime, endTime, line);

        // @ts-ignore
        const maxDurationResponse = await EventDAO.getMaxDuration(stream_id, startTime, endTime, line);
        // @ts-ignore
        const minDurationResponse = await EventDAO.getMinDuration(stream_id, startTime, endTime, line);

        if (avgDurationResponse.length > 0) {
            result.avg = avgDurationResponse[0].avg;
            result.total_data = parseInt(avgDurationResponse[0].total_data);
        }

        if (maxDurationResponse.length > 0) {
            result.max = maxDurationResponse[0];
        }

        if (minDurationResponse.length > 0) {
            result.min = minDurationResponse[0];
        }

        response.forEach(data => {
            ranking[data.interval_alias] = {avg: data.avg, total_data: parseInt(data.count)};

            result.heatmap_data.push({
                event_time: data.interval_alias,
                avg: Math.round(data.avg * 100) / 100,
            });
        });

        //only return top 3 ranking
        result.ranking = Object.fromEntries(
            Object.entries(ranking)   // @ts-ignore
                .sort(([, a], [, b]) => b.avg - a.avg)
                .slice(0, 3)
        );
    } else {
        result = {total: 0, heatmap_data: []};

        // @ts-ignore
        const response = await EventDAO.getCountGroupByTimeAndStatus([stream_id], analytic_id, startTime, endTime, interval, line);

        response.forEach(data => {
            ranking[data.interval_alias] = parseInt(data.count);

            result.total += parseInt(data.count);
            result.heatmap_data.push({
                event_time: data.interval_alias,
                count: parseInt(data.count)
            });
        });

        //only return top 3 ranking
        result.ranking = Object.fromEntries(
            Object.entries(ranking)   // @ts-ignore
                .sort(([, a], [, b]) => b - a)
                .slice(0, 3)
        );
    }

    return result;
}
