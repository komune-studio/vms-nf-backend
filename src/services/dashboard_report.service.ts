import moment from "moment";
import MapSiteStreamDAO from "../daos/map_site_stream.dao";
import SiteDAO from "../daos/site.dao";
import StreamDAO from "../daos/stream.dao";
import {analyticName} from "../utils/analytic.utils";
import {ChartSeries, renderCartesianChart} from "../utils/chart.utils";
import {DashboardReportContext, DashboardTableColumn} from "../utils/dashboard_report.utils";
import {localeNumber, numberOf} from "../utils/pdf.utils";
import * as DashboardSummary from "./dashboard_summary.service";

/**
 * Merakit isi laporan PDF Dashboard untuk satu tab.
 *
 * Angka-angkanya diturunkan dengan cara yang sama seperti komponen di layar
 * (lihat Dashboard.js): total diambil dari summary_location, rincian per
 * kategori dijumlahkan dari detailed_summary_location.
 */

export interface DashboardReportRequest {
    /** null berarti tab General. */
    analytic: string | null
    streams: string[]
    startDate: any
    endDate: any
    interval: number
}

const VEHICLE_COLORS = ['#90D278', '#2165D2', '#D22F27', '#FDD264'];
const PEOPLE_COLORS = ['#2165D2', '#90D278'];
const DWELLING_COLOR = '#00acee';

const formatDuration = (seconds: any): string => `${Math.round(numberOf(seconds) * 100) / 100}s`;

/** Label sumbu-X mengikuti format yang dipakai AppWebsiteVisits di dashboard. */
const bucketLabels = (summary: any, interval: number): string[] =>
    Object.keys(summary ?? {}).map(key =>
        moment(key, 'DD-MM-YYYY HH:mm').format(interval !== 86400 ? 'D MMM, HH:mm' : 'D MMM'));

/** Nama site per stream, untuk kolom Site di tabel. */
async function siteNames(streamIds: string[]): Promise<Record<string, string>> {
    const [mapping, sites] = await Promise.all([
        MapSiteStreamDAO.getByStreamIds(streamIds),
        SiteDAO.getAll()
    ]);

    const byId = new Map(sites.map((site: any) => [String(site.id), site.name]));
    const result: Record<string, string> = {};

    mapping.forEach((entry: any) => {
        const name = byId.get(String(entry.site_id));
        if (name) result[entry.stream_id] = name;
    });

    return result;
}

/**
 * Satu baris per kamera. detailed_summary_location membawa beberapa baris per
 * kamera (satu per label/gender), jadi di sini digabungkan.
 */
function rowsPerCamera(detailed: any[], sites: Record<string, string>, breakdownKey: 'status' | 'gender' | null): any[] {
    const byStream = new Map<string, any>();

    detailed.forEach(entry => {
        if (!byStream.has(entry.stream_id)) {
            byStream.set(entry.stream_id, {
                camera: entry.location ?? '-',
                site: sites[entry.stream_id] ?? '-',
                detections: 0,
                avg: 0
            });
        }

        const row = byStream.get(entry.stream_id);

        row.detections += numberOf(entry.count);

        // Dwelling: satu baris per kamera, avg-nya dipakai apa adanya.
        if (entry.avg !== undefined && entry.avg !== null) row.avg = numberOf(entry.avg);

        if (breakdownKey && entry[breakdownKey]) {
            const key = String(entry[breakdownKey]).toLowerCase();
            row[key] = numberOf(row[key]) + numberOf(entry.count);
        }
    });

    return Array.from(byStream.values());
}

export default async function buildDashboardReport(request: DashboardReportRequest): Promise<DashboardReportContext> {
    const {analytic, streams, startDate, endDate, interval} = request;

    const allStreams = await StreamDAO.getAll();
    const selected = allStreams.filter((stream: any) => streams.includes(stream.id));

    const cameraNames = selected.map((stream: any) => stream.name).filter(Boolean)
        .sort((a: string, b: string) => a.localeCompare(b));

    const sites = await siteNames(streams);

    const base = {
        startDate: startDate ?? null,
        endDate: endDate ?? null,
        cameraNames
    };

    if (!analytic) {
        const [people, vehicle, dwelling, summary] = await Promise.all([
            DashboardSummary.peopleCount(streams, startDate, endDate),
            DashboardSummary.vehicleCount(streams, startDate, endDate),
            DashboardSummary.avgVehicleDwelling(streams, startDate, endDate),
            DashboardSummary.peopleAndVehicleSummary(streams, startDate, endDate, interval)
        ]);

        const categories = bucketLabels(summary, interval);
        const series: ChartSeries[] = [
            {name: 'People', data: Object.values(summary).map((entry: any) => numberOf(entry['NFV4-MPAA']))},
            {name: 'Vehicle', data: Object.values(summary).map((entry: any) => numberOf(entry['NFV4-MVA']))}
        ];

        return {
            ...base,
            title: 'General',
            headline: null,
            tiles: [
                {label: 'Total People Count', value: localeNumber(people)},
                {label: 'Total Vehicle Count', value: localeNumber(vehicle)},
                {label: 'Avg. Vehicle Dwelling', value: formatDuration(dwelling)}
            ],
            perRow: 3,
            chart: categories.length > 0
                ? renderCartesianChart({categories, series, colors: PEOPLE_COLORS, type: 'bar', legend: true})
                : null,
            chartTitle: 'Count Statistic',
            // Tab General di layar memang tidak punya tabel per kamera.
            columns: [],
            rows: []
        };
    }

    if (analytic === 'NFV4-VD') {
        const [summary, summaryLocation, detailed] = await Promise.all([
            DashboardSummary.dwellingSummary(streams, startDate, endDate, interval),
            DashboardSummary.dwellingSummaryLocation(streams, startDate, endDate),
            DashboardSummary.detailedSummaryLocation(streams, startDate, endDate, analytic)
        ]);

        const categories = bucketLabels(summary, interval);
        const series: ChartSeries[] = [{
            name: 'Average Dwelling Time',
            data: Object.values(summary).map((entry: any) => Math.round(numberOf(entry.avg_dwelling_time) * 100) / 100)
        }];

        // Sama seperti di layar: rata-rata dari rata-rata per kamera.
        const overallAvg = detailed.length > 0
            ? detailed.reduce((sum, entry) => sum + numberOf(entry.avg), 0) / detailed.length
            : 0;

        const totalVehicles = Object.values(summaryLocation).reduce((sum: number, value: any) => sum + numberOf(value), 0);

        return {
            ...base,
            title: analyticName(analytic),
            headline: {label: 'Average Dwelling Time', value: formatDuration(overallAvg)},
            tiles: [{label: 'Total Vehicles', value: localeNumber(totalVehicles)}],
            perRow: 3,
            chart: categories.length > 0
                ? renderCartesianChart({
                    categories, series, colors: [DWELLING_COLOR], type: 'line', legend: false,
                    valueFormat: value => formatDuration(value)
                })
                : null,
            chartTitle: 'Average Dwelling Time Statistic',
            columns: [
                {key: 'avg', label: 'Avg Dwelling', type: 'duration'},
                {key: 'detections', label: 'Vehicles', type: 'count'}
            ],
            rows: rowsPerCamera(detailed, sites, null)
        };
    }

    const isVehicle = analytic === 'NFV4-VC';

    const [{summary, summary_location}, detailed] = await Promise.all([
        DashboardSummary.countingSummary(streams, startDate, endDate, analytic, interval),
        DashboardSummary.detailedSummaryLocation(streams, startDate, endDate, analytic)
    ]);

    const breakdown = isVehicle
        ? ['car', 'motorcycle', 'truck', 'bus']
        : ['male', 'female'];

    const breakdownKey = isVehicle ? 'status' : 'gender';

    const sumBy = (value: string) => detailed.reduce((sum, entry) =>
        String(entry[breakdownKey]).toLowerCase() === value ? sum + numberOf(entry.count) : sum, 0);

    const total = Object.values(summary_location).reduce((sum: number, value: any) => sum + numberOf(value), 0);

    const categories = bucketLabels(summary, interval);
    const series: ChartSeries[] = breakdown.map(key => ({
        // Kunci pada summary mengikuti bentuk aslinya: huruf kecil untuk
        // kendaraan, kapital untuk gender.
        name: key[0].toUpperCase() + key.slice(1),
        data: Object.values(summary).map((entry: any) =>
            numberOf(entry[isVehicle ? key : key[0].toUpperCase() + key.slice(1)]))
    }));

    return {
        ...base,
        title: analyticName(analytic),
        headline: {label: 'Total Detection', value: localeNumber(total)},
        tiles: breakdown.map(key => ({
            label: key[0].toUpperCase() + key.slice(1),
            value: localeNumber(sumBy(key))
        })),
        perRow: breakdown.length,
        chart: categories.length > 0
            ? renderCartesianChart({
                categories, series,
                colors: isVehicle ? VEHICLE_COLORS : PEOPLE_COLORS,
                type: 'bar', stacked: true, legend: true
            })
            : null,
        chartTitle: 'Count Statistic',
        columns: [
            {key: 'detections', label: 'Detections', type: 'count'},
            ...breakdown.map((key): DashboardTableColumn => ({
                key,
                label: key[0].toUpperCase() + key.slice(1),
                type: 'count'
            }))
        ],
        rows: rowsPerCamera(detailed, sites, breakdownKey)
    };
}
