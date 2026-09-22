import moment from "moment";
import {CartesianChartOptions} from "./chart.utils";


export interface RankEntry {
    date: Date | string
    total: number
    avg?: string
}

export interface MainChart {
    title: string
    options: CartesianChartOptions
}

export interface HeatmapModel {
    title: string
    xCategories: string[]
    yCategories: string[]
    data: number[][]
}

const VC_COLORS = ['#90D278', '#2165D2', '#D22F27', '#FDD264'];
const VC_ORDER = ['Car', 'Motorcycle', 'Bus', 'Truck'];
const PC_COLOR = 'rgb(29, 30, 48)';
const VD_COLOR = '#00acee';

const capitalize = (value: string): string =>
    value ? value[0].toUpperCase() + value.substring(1) : value;

export const formatDuration = (seconds: number): string =>
    `${Math.round((Number(seconds) || 0) * 100) / 100}s`;

const periodLabel = (time: string): string =>
    time === 'today' ? 'Day' : time === 'this_week' ? 'Week' : time === 'this_month' ? 'Month' : '';

const detectionTitle = (time: string): string =>
    time === 'today' ? 'Today Detection' :
        time === 'this_week' ? 'This Week Detection' :
            time === 'this_month' ? 'This Month Detection' : 'Detection';


export const mainChartTitle = (analytic: string, time: string): string =>
    analytic === 'NFV4-VD' ? 'Count Statistic' : detectionTitle(time);

export const heatmapTitle = (time: string): string =>
    time === 'today' ? 'Today Heatmap' :
        time === 'this_week' ? 'This Week Heatmap' :
            time === 'this_month' ? 'This Month Heatmap' : 'Heatmap';

export const rankingTitle = (time: string): string => {
    const period = periodLabel(time);

    return `Top Peak Hours${period ? ` on This ${period}` : ''}`;
};

interface AxisFormats {
    today: string
    week: string
    month: string
    custom: string
}

interface AxisOptions {
    fullWeek?: boolean
    fillMonth?: boolean
}

interface TimeAxis {
    labels: string[]
    size: number
    indexOf: (date: Date) => number
}

const rows = (summary: any): any[] => Array.isArray(summary?.heatmap_data) ? summary.heatmap_data : [];


function buildTimeAxis(time: string, data: any[], interval: number, formats: AxisFormats, options: AxisOptions = {}): TimeAxis {
    if (time === 'today') {
        let latestHour = 0;
        data.forEach(row => {
            const hour = new Date(row.event_time).getHours();
            if (hour > latestHour) latestHour = hour;
        });

        const labels: string[] = [];
        for (let hour = 0; hour <= latestHour; hour += 1) {
            labels.push(moment().startOf('day').add(hour, 'hours').format(formats.today));
        }

        return {labels, size: labels.length, indexOf: date => date.getHours()};
    }

    if (time === 'this_week') {
        let latestDay = 1;
        data.forEach(row => {
            const isoWeekday = moment(row.event_time).isoWeekday();
            if (isoWeekday > latestDay) latestDay = isoWeekday;
        });

        const lastDay = options.fullWeek ? 7 : latestDay;
        const labels: string[] = [];

        for (let day = 0; day < lastDay; day += 1) {
            labels.push(moment().startOf('isoWeek').add(day, 'days').format(formats.week));
        }

        return {labels, size: labels.length, indexOf: date => moment(date).isoWeekday() - 1};
    }

    if (time === 'this_month') {
        if (options.fillMonth) {
            let latestDate = 1;
            data.forEach(row => {
                const dayOfMonth = new Date(row.event_time).getDate();
                if (dayOfMonth > latestDate) latestDate = dayOfMonth;
            });

            const labels: string[] = [];
            for (let day = 1; day <= latestDate; day += 1) {
                labels.push(moment().startOf('month').add(day - 1, 'days').format(formats.month));
            }

            return {labels, size: labels.length, indexOf: date => date.getDate() - 1};
        }

        const days: number[] = [];
        data.forEach(row => {
            const dayOfMonth = new Date(row.event_time).getDate();
            if (!days.includes(dayOfMonth)) days.push(dayOfMonth);
        });
        days.sort((a, b) => a - b);

        const labels = days.map(day => moment().startOf('month').add(day - 1, 'days').format(formats.month));

        return {
            labels,
            size: labels.length,
            indexOf: date => days.indexOf(date.getDate())
        };
    }

    // custom: setiap bucket dari query jadi satu titik. Kalau bucket-nya terlalu
    // rapat, dipadatkan jadi per hari -- sama seperti mode `compact` di VCGraphs.
    const buckets: number[] = [];
    data.forEach(row => {
        const at = new Date(row.event_time).getTime();
        if (!buckets.includes(at)) buckets.push(at);
    });
    buckets.sort((a, b) => a - b);

    const compact = buckets.length > 10 && interval < 86400;

    if (compact) {
        const days: string[] = [];
        buckets.forEach(at => {
            const key = moment(at).format('YYYY-MM-DD');
            if (!days.includes(key)) days.push(key);
        });

        return {
            labels: days.map(day => moment(day, 'YYYY-MM-DD').format('DD MMM')),
            size: days.length,
            indexOf: date => days.indexOf(moment(date).format('YYYY-MM-DD'))
        };
    }

    return {
        labels: buckets.map(at => moment(at).format(formats.custom)),
        size: buckets.length,
        indexOf: date => buckets.indexOf(date.getTime())
    };
}

function emptySeries(size: number): number[] {
    return Array.from({length: size}, () => 0);
}

export function buildMainChart(analytic: string, summary: any, time: string, interval: number): MainChart | null {
    const data = rows(summary);

    if (data.length === 0) return null;

    if (analytic === 'NFV4-VC') {
        const axis = buildTimeAxis(time, data, interval, {
            today: 'h:mm A',
            week: 'dddd',
            month: 'DD MMM',
            custom: 'DD MMM, HH:mm'
        });

        const byLabel = new Map<string, number[]>();

        data.forEach(row => {
            const name = capitalize(String(row.label ?? ''));
            const index = axis.indexOf(new Date(row.event_time));
            if (index < 0 || index >= axis.size) return;

            if (!byLabel.has(name)) byLabel.set(name, emptySeries(axis.size));
            byLabel.get(name)![index] += Number(row.count) || 0;
        });

        const series = Array.from(byLabel.entries())
            .map(([name, values]) => ({name, data: values}))
            .sort((a, b) => VC_ORDER.indexOf(a.name) - VC_ORDER.indexOf(b.name));

        return {
            title: detectionTitle(time),
            options: {
                categories: axis.labels,
                series,
                // Warna mengikuti urutan VC_ORDER, jadi seri yang hilang (mis.
                // tidak ada bus sama sekali) tidak menggeser warna seri lain.
                colors: series.map(entry => VC_COLORS[Math.max(0, VC_ORDER.indexOf(entry.name))]),
                type: 'bar',
                stacked: true,
                legend: true
            }
        };
    }

    if (analytic === 'NFV4-MPAA') {
        const axis = buildTimeAxis(time, data, interval, {
            today: 'HH:mm',
            week: 'DD MMM',
            month: 'DD MMM',
            custom: interval === 3600 ? 'DD MMM, HH:mm' : 'DD MMM'
        }, {fullWeek: true, fillMonth: true});

        const values = emptySeries(axis.size);

        data.forEach(row => {
            const index = axis.indexOf(new Date(row.event_time));
            if (index < 0 || index >= axis.size) return;

            values[index] += Number(row.count) || 0;
        });

        return {
            title: detectionTitle(time),
            options: {
                categories: axis.labels,
                series: [{name: 'Person', data: values}],
                colors: [PC_COLOR],
                type: 'bar',
                legend: false
            }
        };
    }

    if (analytic === 'NFV4-VD') {
        const axis = buildTimeAxis(time, data, interval, {
            today: 'HH:mm',
            week: 'DD MMM',
            month: 'DD MMM',
            custom: interval === 3600 ? 'DD MMM, HH:mm' : 'DD MMM'
        }, {fullWeek: true, fillMonth: true});

        const values = emptySeries(axis.size);

        data.forEach(row => {
            const index = axis.indexOf(new Date(row.event_time));
            if (index < 0 || index >= axis.size) return;

            // Rata-rata, bukan jumlah: bucket yang sama ditimpa, bukan ditambah.
            values[index] = Number(row.avg) || 0;
        });

        return {
            title: 'Count Statistic',
            options: {
                categories: axis.labels,
                series: [{name: 'Vehicles', data: values}],
                colors: [VD_COLOR],
                type: 'line',
                legend: false,
                valueFormat: value => formatDuration(value)
            }
        };
    }

    // Analitik lain hanya punya `count` per bucket.
    const axis = buildTimeAxis(time, data, interval, {
        today: 'HH:mm',
        week: 'DD MMM',
        month: 'DD MMM',
        custom: 'DD MMM, HH:mm'
    }, {fullWeek: true, fillMonth: true});

    const values = emptySeries(axis.size);

    data.forEach(row => {
        const index = axis.indexOf(new Date(row.event_time));
        if (index < 0 || index >= axis.size) return;

        values[index] += Number(row.count) || 0;
    });

    return {
        title: detectionTitle(time),
        options: {
            categories: axis.labels,
            series: [{name: 'Detections', data: values}],
            colors: [PC_COLOR],
            type: 'bar',
            legend: false
        }
    };
}

const rankingDate = (key: string): Date | string => {
    const parsed = new Date(key);

    return Number.isNaN(parsed.getTime()) ? key : parsed;
};

export function buildRanking(analytic: string, summary: any): RankEntry[] {
    const ranking = summary?.ranking;

    if (!ranking || typeof ranking !== 'object') return [];

    if (analytic === 'NFV4-VD') {
        return Object.entries(ranking)
            .sort((a: any, b: any) => b[1].total_data - a[1].total_data)
            .map(([date, value]: [string, any]) => ({
                date: rankingDate(date),
                total: value.total_data,
                avg: formatDuration(value.avg)
            }))
            .filter(entry => entry.total);
    }

    return Object.entries(ranking)
        .sort((a: any, b: any) => b[1] - a[1])
        .map(([date, total]: [string, any]) => ({date: rankingDate(date), total: Number(total) || 0}))
        .filter(entry => entry.total);
}

export function buildHeatmap(analytic: string, summary: any, time: string): HeatmapModel | null {
    const data = rows(summary);

    if (data.length === 0) return null;

    const perBucket = new Map<number, number>();

    data.forEach(row => {
        const at = new Date(row.event_time).getTime();

        if (analytic === 'NFV4-VD') {
            perBucket.set(at, Number(row.avg) || 0);
        } else {
            perBucket.set(at, (perBucket.get(at) ?? 0) + (Number(row.count) || 0));
        }
    });

    const yCategories = heatmapRows(data, time);

    if (yCategories.length === 0) return null;

    const rowOf = heatmapRowResolver(data, time);
    const grid: number[][] = yCategories.map(() => Array.from({length: 24}, () => 0));

    perBucket.forEach((value, at) => {
        const date = new Date(at);
        const y = rowOf(date);

        if (y < 0 || y >= yCategories.length) return;

        grid[y][date.getHours()] = value;
    });

    const xCategories: string[] = [];
    for (let hour = 0; hour < 24; hour += 1) {
        const from = String(hour).padStart(2, '0');
        const to = String(hour + 1).padStart(2, '0');
        xCategories.push(`${from}:01 - ${to}:00`);
    }

    return {title: heatmapTitle(time), xCategories, yCategories, data: grid};
}

function heatmapRows(data: any[], time: string): string[] {
    if (time === 'today') return [moment().format('dddd')];

    if (time === 'this_week') {
        return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    }

    if (time === 'this_month') {
        const daysInMonth = moment().daysInMonth();
        const labels: string[] = [];

        for (let day = 1; day <= daysInMonth; day += 1) {
            labels.push(moment().startOf('month').add(day - 1, 'days').format('DD MMM'));
        }

        return labels;
    }

    const days: string[] = [];
    data.forEach(row => {
        const key = moment(row.event_time).format('DD MMM');
        if (!days.includes(key)) days.push(key);
    });

    return days;
}

function heatmapRowResolver(data: any[], time: string): (date: Date) => number {
    if (time === 'this_week') {
        return date => {
            const day = date.getDay();
            return day === 0 ? 6 : day - 1;
        };
    }

    if (time === 'this_month') return date => date.getDate() - 1;

    if (time === 'custom') {
        const days: string[] = [];
        data.forEach(row => {
            const key = moment(row.event_time).format('DD MMM');
            if (!days.includes(key)) days.push(key);
        });

        return date => days.indexOf(moment(date).format('DD MMM'));
    }

    return () => 0;
}
