import PDFDocument from "pdfkit";
import moment from "moment";
import {
    BORDER,
    bottomLimit,
    CARD_PADDING,
    contentWidth,
    drawCard,
    drawDefinitionCard,
    drawFooters,
    drawReportHeader,
    drawTiles,
    ensureSpace,
    INK,
    joinNames,
    localeNumber,
    MARGIN,
    MUTED,
    SOFT,
    Tile,
    tileHeightOf
} from "./pdf.utils";



export interface DashboardTableColumn {
    key: string
    label: string
    type: 'count' | 'duration'
}

export interface DashboardReportContext {
    title: string
    startDate: string | null
    endDate: string | null
    cameraNames: string[]
    headline: Tile | null
    tiles: Tile[]
    perRow: number
    chart: Buffer | null
    chartTitle: string
    /** Kosong untuk tab General -- di layar pun tabelnya memang tidak ada. */
    columns: DashboardTableColumn[]
    rows: any[]
}

const ROW_HEIGHT = 22;
const HEADER_HEIGHT = 22;
const CAMERA_WIDTH = 150;
const SITE_WIDTH = 110;
const VALUE_MAX_WIDTH = 86;

const dateText = (value: string | null): string =>
    value ? moment(value).format('ddd, DD MMM YYYY HH:mm') : '-';

const formatCell = (value: any, type: DashboardTableColumn['type']): string => {
    const numeric = Number(value) || 0;

    return type === 'duration' ? `${numeric.toFixed(2)}s` : localeNumber(numeric);
};

const valueWidthOf = (doc: PDFKit.PDFDocument, columns: DashboardTableColumn[]): number =>
    columns.length === 0
        ? 0
        : Math.min(VALUE_MAX_WIDTH, (contentWidth(doc) - CAMERA_WIDTH - SITE_WIDTH) / columns.length);

function drawSummary(doc: PDFKit.PDFDocument, y: number, context: DashboardReportContext): number {
    const {headline, tiles, perRow} = context;

    const rowCount = tiles.length === 0 ? 0 : Math.ceil(tiles.length / perRow);
    const height = 34 + (headline ? 46 : 0) + rowCount * (tileHeightOf(tiles) + 10) + 4;

    const top = ensureSpace(doc, y, height);
    const contentTop = drawCard(doc, top, height, 'Summary');

    let cursor = contentTop;

    if (headline) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(headline.label, MARGIN + CARD_PADDING, cursor);
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(22)
            .text(headline.value, MARGIN + CARD_PADDING, cursor + 13, {width: contentWidth(doc) - CARD_PADDING * 2});

        cursor += 46;
    }

    drawTiles(doc, cursor, tiles, perRow);

    return top + height + 12;
}

function drawChart(doc: PDFKit.PDFDocument, y: number, context: DashboardReportContext): number {
    const width = contentWidth(doc);
    const imageWidth = width - CARD_PADDING * 2;
    // 920 x 340 adalah ukuran logis grafik di chart.utils.
    const imageHeight = context.chart ? imageWidth * (340 / 920) : 40;
    const height = 34 + imageHeight + 14;

    const top = ensureSpace(doc, y, height);
    const contentTop = drawCard(doc, top, height, context.chartTitle);

    if (context.chart) {
        doc.image(context.chart, MARGIN + CARD_PADDING, contentTop, {width: imageWidth});
    } else {
        doc.fillColor(MUTED).font('Helvetica').fontSize(10)
            .text('No Data Available', MARGIN + CARD_PADDING, contentTop + 10, {width: imageWidth, align: 'center'});
    }

    return top + height + 12;
}

function drawTableHead(doc: PDFKit.PDFDocument, y: number, columns: DashboardTableColumn[]): number {
    const width = contentWidth(doc);
    const valueWidth = valueWidthOf(doc, columns);

    doc.rect(MARGIN, y, width, HEADER_HEIGHT).fill(SOFT);
    doc.font('Helvetica-Bold').fontSize(8).fillColor(MUTED);

    doc.text('CAMERA', MARGIN + 8, y + 7, {width: CAMERA_WIDTH - 16, ellipsis: true, lineBreak: false});
    doc.text('SITE', MARGIN + CAMERA_WIDTH + 8, y + 7, {width: SITE_WIDTH - 16, ellipsis: true, lineBreak: false});

    columns.forEach((column, index) => {
        doc.text(column.label.toUpperCase(), MARGIN + CAMERA_WIDTH + SITE_WIDTH + valueWidth * index, y + 7, {
            width: valueWidth - 8,
            align: 'right',
            ellipsis: true,
            lineBreak: false
        });
    });

    doc.moveTo(MARGIN, y + HEADER_HEIGHT).lineTo(MARGIN + width, y + HEADER_HEIGHT)
        .lineWidth(0.5).strokeColor(BORDER).stroke();

    return y + HEADER_HEIGHT;
}

function drawRow(doc: PDFKit.PDFDocument, y: number, row: any, columns: DashboardTableColumn[], bold = false) {
    const width = contentWidth(doc);
    const valueWidth = valueWidthOf(doc, columns);

    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.5).fillColor(INK);

    doc.text(String(row.camera ?? '-'), MARGIN + 8, y + 7, {width: CAMERA_WIDTH - 16, ellipsis: true, lineBreak: false});
    doc.text(String(row.site ?? '-'), MARGIN + CAMERA_WIDTH + 8, y + 7, {width: SITE_WIDTH - 16, ellipsis: true, lineBreak: false});

    columns.forEach((column, index) => {
        const value = row[column.key];

        doc.text(value === null || value === undefined ? '—' : formatCell(value, column.type),
            MARGIN + CAMERA_WIDTH + SITE_WIDTH + valueWidth * index, y + 7, {
                width: valueWidth - 8,
                align: 'right',
                lineBreak: false
            });
    });

    doc.moveTo(MARGIN, y + ROW_HEIGHT).lineTo(MARGIN + width, y + ROW_HEIGHT)
        .lineWidth(0.5).strokeColor(BORDER).stroke();
}


function totalRow(rows: any[], columns: DashboardTableColumn[]): any {
    const total: any = {camera: 'TOTAL', site: ''};

    columns.forEach(column => {
        total[column.key] = column.type === 'duration'
            ? null
            : rows.reduce((sum, row) => sum + (Number(row[column.key]) || 0), 0);
    });

    return total;
}

function drawTable(doc: PDFKit.PDFDocument, y: number, context: DashboardReportContext): number {
    const {columns, rows} = context;
    const width = contentWidth(doc);

    let cursor = ensureSpace(doc, y, HEADER_HEIGHT + ROW_HEIGHT + 28);

    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text('Detection per Camera', MARGIN, cursor);
    cursor = drawTableHead(doc, cursor + 20, columns);

    if (rows.length === 0) {
        doc.fillColor(MUTED).font('Helvetica').fontSize(10)
            .text('No Data Available', MARGIN, cursor + 14, {width, align: 'center'});

        return cursor + 40;
    }

    rows.forEach(row => {
        if (cursor + ROW_HEIGHT > bottomLimit(doc)) {
            doc.addPage();
            cursor = drawTableHead(doc, MARGIN, columns);
        }

        drawRow(doc, cursor, row, columns);
        cursor += ROW_HEIGHT;
    });

    if (cursor + ROW_HEIGHT > bottomLimit(doc)) {
        doc.addPage();
        cursor = drawTableHead(doc, MARGIN, columns);
    }

    doc.rect(MARGIN, cursor, width, ROW_HEIGHT).fill(SOFT);
    drawRow(doc, cursor, totalRow(rows, columns), columns, true);

    return cursor + ROW_HEIGHT + 18;
}

export default function buildDashboardPDF(context: DashboardReportContext): PDFKit.PDFDocument {
    const doc = new PDFDocument({size: 'A4', margin: MARGIN, bufferPages: true, layout: 'landscape'});

    doc.info.Title = `Dashboard Report - ${context.title}`;
    doc.info.Author = 'Komune Studio';

    const period = `${dateText(context.startDate)} to ${dateText(context.endDate)}`;

    let y = drawReportHeader(doc, 'Dashboard Report', `${context.title} · ${period}`);

    y = drawDefinitionCard(doc, y, 'Data Showed', [
        ['Start', dateText(context.startDate)],
        ['End', dateText(context.endDate)],
        ['Camera', joinNames(context.cameraNames, 'All cameras'), true],
        ['Analytic', context.title]
    ]);

    y = drawSummary(doc, y, context);


    if (context.columns.length > 0) {
        y = drawTable(doc, y, context);
    }

    drawChart(doc, y, context);

    drawFooters(doc, `Dashboard · ${context.title}`);

    return doc;
}
