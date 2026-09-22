import PDFDocument from "pdfkit";
import moment from "moment";
import {RankEntry} from "./camera_chart_data.utils";
import {
    BORDER,
    contentWidth,
    drawCard,
    drawFooters,
    drawReportHeader,
    drawTiles,
    ensureSpace,
    INK,
    localeNumber,
    MARGIN,
    MUTED,
    numberOf,
    Tile,
    tileHeightOf
} from "./pdf.utils";



export interface StreamReportContext {
    streamName: string
    address: string | null
    site: string | null
    license: string | null
    nodeNum: string | number | null
    latitude: number | string | null
    longitude: number | string | null
    state: string | null
    analytic: string
    analyticName: string
    time: string
    line: string | null
    startTime: string
    endTime: string | null
    summary: any
    ranking: RankEntry[]
    rankingTitle: string
    rankingUnit: string
    rankingAvgUnit?: string
    mainChart: Buffer | null
    mainChartTitle: string
    heatmap: Buffer | null
    heatmapTitle: string
    heatmapHeight: number
    heatmapWidth: number
}

const formatDuration = (seconds: any): string => `${Math.round(numberOf(seconds) * 100) / 100}s`;

const periodText = (context: StreamReportContext): string => {
    if (context.time === 'today') return `Today — ${moment(context.startTime).format('DD MMM YYYY')}`;
    if (context.time === 'this_week') return `This Week — ${moment(context.startTime).format('DD MMM YYYY')} to ${moment(context.endTime ?? undefined).format('DD MMM YYYY')}`;
    if (context.time === 'this_month') return `This Month — ${moment(context.startTime).format('MMMM YYYY')}`;

    return `${moment(context.startTime).format('DD MMM YYYY, HH:mm')} to ${moment(context.endTime ?? undefined).format('DD MMM YYYY, HH:mm')}`;
};

function drawInfo(doc: PDFKit.PDFDocument, y: number, context: StreamReportContext): number {
    const entries: Array<[string, string]> = [
        ['Address', context.address || '-'],
        ['Site', context.site || '-'],
        ['License', context.license || '-'],
        ['Analytic', context.analyticName],
        ['Line', context.line || 'All Line'],
        ['Coordinates', context.latitude && context.longitude ? `${context.latitude}, ${context.longitude}` : '-'],
        ['Status', context.state ? String(context.state).toUpperCase() : '-']
    ];

    const height = 34 + 14 + entries.length * 15 + 12;
    const top = ensureSpace(doc, y, height);
    const width = contentWidth(doc);

    doc.roundedRect(MARGIN, top, width, height, 6).lineWidth(1).fillAndStroke('#FFFFFF', BORDER);

    doc.fillColor(INK)
        .font('Helvetica-Bold')
        .fontSize(14)
        .text(context.streamName || '-', MARGIN + 14, top + 14, {width: width - 28});

    let cursor = top + 38;

    entries.forEach(([label, value]) => {
        doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(label, MARGIN + 14, cursor, {width: 86});
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(9)
            .text(value, MARGIN + 104, cursor, {width: width - 118, ellipsis: true, lineBreak: false});

        cursor += 15;
    });

    return top + height + 12;
}

function summaryTiles(context: StreamReportContext): {headline: Tile | null, tiles: Tile[], perRow: number} {
    const summary = context.summary ?? {};

    if (context.analytic === 'NFV4-VC') {
        const total = numberOf(summary.car) + numberOf(summary.truck) + numberOf(summary.motorcycle) + numberOf(summary.bus);

        return {
            headline: {label: 'Total Detections', value: localeNumber(total)},
            tiles: [
                {label: 'Car', value: localeNumber(summary.car)},
                {label: 'Motorcycle', value: localeNumber(summary.motorcycle)},
                {label: 'Truck', value: localeNumber(summary.truck)},
                {label: 'Bus', value: localeNumber(summary.bus)}
            ],
            perRow: 4
        };
    }

    if (context.analytic === 'NFV4-MPAA') {
        const total = numberOf(summary.Male) + numberOf(summary.Female);

        return {
            headline: {label: 'Total Detections', value: localeNumber(total)},
            tiles: [
                {label: 'Male', value: localeNumber(summary.Male)},
                {label: 'Female', value: localeNumber(summary.Female)}
            ],
            perRow: 2
        };
    }

    if (context.analytic === 'NFV4-VD') {
        const at = (event: any): string | undefined => event?.event_time
            ? `on ${moment(event.event_time).format('DD MMM YYYY')} at ${moment(event.event_time).format('HH:mm')}`
            : undefined;

        return {
            headline: {
                label: 'Average Dwelling Time',
                value: summary.avg ? formatDuration(summary.avg) : '-'
            },
            tiles: [
                {
                    label: 'Shortest Time',
                    value: summary.min?.duration ? formatDuration(summary.min.duration) : '-',
                    hint: at(summary.min)
                },
                {
                    label: 'Longest Time',
                    value: summary.max?.duration ? formatDuration(summary.max.duration) : '-',
                    hint: at(summary.max)
                },
                {label: 'Total Data', value: localeNumber(summary.total_data)}
            ],
            perRow: 3
        };
    }

    if (context.analytic === 'NFV4-FR' || context.analytic === 'NFV4H-FR' || context.analytic === 'NFV4-LPR2') {
        const total = numberOf(summary.KNOWN) + numberOf(summary.UNKNOWN);

        return {
            headline: {label: 'Total Detections', value: localeNumber(total)},
            tiles: [
                {label: 'Known', value: localeNumber(summary.KNOWN)},
                {label: 'Unknown', value: localeNumber(summary.UNKNOWN)}
            ],
            perRow: 2
        };
    }

    return {
        headline: {label: 'Total Detections', value: localeNumber(summary.total)},
        tiles: [],
        perRow: 2
    };
}

function drawSummary(doc: PDFKit.PDFDocument, y: number, context: StreamReportContext): number {
    const {headline, tiles, perRow} = summaryTiles(context);

    const rowCount = tiles.length === 0 ? 0 : Math.ceil(tiles.length / perRow);
    const height = 34 + (headline ? 46 : 0) + rowCount * (tileHeightOf(tiles) + 10) + 4;

    const top = ensureSpace(doc, y, height);
    const contentTop = drawCard(doc, top, height, 'Summary');

    let cursor = contentTop;

    if (headline) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(headline.label, MARGIN + 14, cursor);
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(22)
            .text(headline.value, MARGIN + 14, cursor + 13, {width: contentWidth(doc) - 28});

        cursor += 46;
    }

    drawTiles(doc, cursor, tiles, perRow);

    return top + height + 12;
}

function drawRanking(doc: PDFKit.PDFDocument, y: number, context: StreamReportContext): number {
    const entries = context.ranking.slice(0, 3);
    const rowHeight = 34;
    const height = 34 + Math.max(1, entries.length) * rowHeight + 10;

    const top = ensureSpace(doc, y, height);
    const contentTop = drawCard(doc, top, height, context.rankingTitle);
    const width = contentWidth(doc);

    if (entries.length === 0) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(10)
            .text('No Data Available', MARGIN + 14, contentTop + 12, {width: width - 28, align: 'center'});

        return top + height + 12;
    }

    const medals = ['#E8B923', '#B6BCC6', '#C98B5D'];

    entries.forEach((entry, index) => {
        const rowY = contentTop + rowHeight * index;

        doc.circle(MARGIN + 24, rowY + 13, 9).fill(medals[index] ?? medals[2]);
        doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
            .text(String(index + 1), MARGIN + 15, rowY + 9.5, {width: 18, align: 'center'});

        doc.fillColor(INK).font('Helvetica').fontSize(9.5)
            .text(moment(entry.date).format('ddd, DD MMM YYYY'), MARGIN + 42, rowY + 4, {width: width * 0.45});

        doc.fillColor(MUTED).font('Helvetica').fontSize(8)
            .text(moment(entry.date).format('HH:mm - HH:59'), MARGIN + 42, rowY + 17, {width: width * 0.45});

        // Kolom kanan: jumlah, plus rata-rata durasi khusus dwelling.
        const hasAvg = Boolean(entry.avg);
        const valueWidth = 110;
        const avgX = MARGIN + width - 14 - valueWidth;
        const totalX = hasAvg ? avgX - valueWidth : avgX;

        doc.fillColor(INK).font('Helvetica-Bold').fontSize(10)
            .text(localeNumber(entry.total), totalX, rowY + 4, {width: valueWidth, align: 'right'});
        doc.fillColor(MUTED).font('Helvetica').fontSize(8)
            .text(context.rankingUnit, totalX, rowY + 17, {width: valueWidth, align: 'right'});

        if (hasAvg) {
            doc.fillColor(INK).font('Helvetica-Bold').fontSize(10)
                .text(String(entry.avg), avgX, rowY + 4, {width: valueWidth, align: 'right'});
            doc.fillColor(MUTED).font('Helvetica').fontSize(8)
                .text(context.rankingAvgUnit ?? 'avg. time', avgX, rowY + 17, {width: valueWidth, align: 'right'});
        }
    });

    return top + height + 12;
}

function drawChart(doc: PDFKit.PDFDocument, y: number, title: string, image: Buffer | null, aspectRatio: number): number {
    const width = contentWidth(doc);
    const imageWidth = width - 28;
    const imageHeight = image ? imageWidth * aspectRatio : 40;
    const height = 34 + imageHeight + 14;

    const top = ensureSpace(doc, y, height);
    const contentTop = drawCard(doc, top, height, title);

    if (image) {
        doc.image(image, MARGIN + 14, contentTop, {width: imageWidth});
    } else {
        doc.fillColor(MUTED).font('Helvetica').fontSize(10)
            .text('No Data Available', MARGIN + 14, contentTop + 10, {width: imageWidth, align: 'center'});
    }

    return top + height + 12;
}

export default function buildStreamDetailPDF(context: StreamReportContext): PDFKit.PDFDocument {
    const doc = new PDFDocument({size: 'A4', margin: MARGIN, bufferPages: true});

    doc.info.Title = `${context.streamName} - ${context.analyticName} Report`;

    let y = drawReportHeader(doc, 'Camera Analytics Report', `${context.analyticName} · ${periodText(context)}`);

    y = drawInfo(doc, y, context);
    y = drawSummary(doc, y, context);
    y = drawRanking(doc, y, context);

    y = drawChart(doc, y, context.mainChartTitle, context.mainChart, 340 / 920);

    drawChart(doc, y, context.heatmapTitle, context.heatmap, context.heatmapHeight / context.heatmapWidth);

    drawFooters(doc, context.streamName);

    return doc;
}
