import PDFDocument from "pdfkit";
import moment from "moment";
import {
    BORDER,
    bottomLimit,
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



export type LabelTone = 'success' | 'error' | 'primary';

export interface EventReportRow {
    image: Buffer | null
    result: string | null
    label: string | null
    labelTone: LabelTone
    timestamp: string
    location: string
}

export interface EventReportContext {
    analyticName: string
    startDate: string | null
    endDate: string | null
    keyword: string | null
    cameraNames: string[]
    totalData: number
    exportedCount: number
    headline: Tile
    tiles: Tile[]
    perRow: number
    rows: EventReportRow[]
}

const TONES: Record<LabelTone, {bg: string, fg: string}> = {
    success: {bg: '#DFF5E4', fg: '#157347'},
    error: {bg: '#FDE2E1', fg: '#B42318'},
    primary: {bg: '#E3ECFB', fg: '#1B4DB1'}
};

const COLUMNS = {
    image: 66,
    result: 170,
    timestamp: 122
};

const ROW_HEIGHT = 66;
const HEADER_HEIGHT = 26;

const dateText = (value: string | null): string =>
    value ? moment(value).format('ddd, DD MMM YYYY HH:mm') : '-';

const drawDataShowed = (doc: PDFKit.PDFDocument, y: number, context: EventReportContext): number =>
    drawDefinitionCard(doc, y, 'Data Showed', [
        ['Start', dateText(context.startDate)],
        ['End', dateText(context.endDate)],
        ['Camera', joinNames(context.cameraNames, 'All cameras'), true],
        ['Keyword', context.keyword || '-']
    ]);

function drawSummary(doc: PDFKit.PDFDocument, y: number, context: EventReportContext): number {
    const {headline, tiles, perRow} = context;

    const rowCount = tiles.length === 0 ? 0 : Math.ceil(tiles.length / perRow);
    const height = 34 + 46 + rowCount * (tileHeightOf(tiles) + 10) + 4;

    const top = ensureSpace(doc, y, height);
    const contentTop = drawCard(doc, top, height, 'Summary');

    doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(headline.label, MARGIN + 14, contentTop);
    doc.fillColor(INK).font('Helvetica-Bold').fontSize(22)
        .text(headline.value, MARGIN + 14, contentTop + 13, {width: contentWidth(doc) - 28});

    drawTiles(doc, contentTop + 46, tiles, perRow);

    return top + height + 12;
}

function drawTableHeader(doc: PDFKit.PDFDocument, y: number): number {
    const width = contentWidth(doc);
    const locationWidth = width - COLUMNS.image - COLUMNS.result - COLUMNS.timestamp;

    doc.rect(MARGIN, y, width, HEADER_HEIGHT).fill(SOFT);

    const labels: Array<[string, number, number]> = [
        ['Image', MARGIN, COLUMNS.image],
        ['Result', MARGIN + COLUMNS.image, COLUMNS.result],
        ['Timestamp', MARGIN + COLUMNS.image + COLUMNS.result, COLUMNS.timestamp],
        ['Location', MARGIN + COLUMNS.image + COLUMNS.result + COLUMNS.timestamp, locationWidth]
    ];

    doc.fillColor(MUTED).font('Helvetica-Bold').fontSize(8.5);

    labels.forEach(([label, x, columnWidth]) => {
        doc.text(label.toUpperCase(), x + 8, y + 9, {width: columnWidth - 16, ellipsis: true, lineBreak: false});
    });

    return y + HEADER_HEIGHT;
}

function drawChip(doc: PDFKit.PDFDocument, x: number, y: number, text: string, tone: LabelTone, maxWidth: number) {
    const {bg, fg} = TONES[tone];

    doc.font('Helvetica-Bold').fontSize(7.5);

    const textWidth = Math.min(doc.widthOfString(text), maxWidth - 12);
    const chipWidth = textWidth + 12;

    doc.roundedRect(x, y, chipWidth, 14, 4).fill(bg);
    doc.fillColor(fg).text(text, x + 6, y + 4, {width: textWidth, ellipsis: true, lineBreak: false});
}

function drawImageCell(doc: PDFKit.PDFDocument, x: number, y: number, image: Buffer | null) {
    const size = 50;
    const left = x + 8;
    const top = y + (ROW_HEIGHT - size) / 2;

    if (image && image.length > 0) {
        try {
            doc.image(image, left, top, {fit: [size, size], align: 'center', valign: 'center'});
            return;
        } catch (e) {

        }
    }

    doc.roundedRect(left, top, size, size, 4).lineWidth(1).fillAndStroke('#F1F3F5', BORDER);
    doc.fillColor('#B6BCC6').font('Helvetica').fontSize(14)
        .text('-', left, top + size / 2 - 8, {width: size, align: 'center'});
}

function drawRows(doc: PDFKit.PDFDocument, y: number, context: EventReportContext): number {
    const width = contentWidth(doc);
    const locationX = MARGIN + COLUMNS.image + COLUMNS.result + COLUMNS.timestamp;
    const locationWidth = width - COLUMNS.image - COLUMNS.result - COLUMNS.timestamp;

    let cursor = drawTableHeader(doc, y);

    if (context.rows.length === 0) {
        doc.rect(MARGIN, cursor, width, 40).lineWidth(1).stroke(BORDER);
        doc.fillColor(MUTED).font('Helvetica').fontSize(10)
            .text('No Data Available', MARGIN, cursor + 15, {width, align: 'center'});

        return cursor + 40 + 12;
    }

    context.rows.forEach(row => {

        if (cursor + ROW_HEIGHT > bottomLimit(doc)) {
            doc.addPage();
            cursor = drawTableHeader(doc, MARGIN);
        }

        drawImageCell(doc, MARGIN, cursor, row.image);

        const resultX = MARGIN + COLUMNS.image;
        let resultY = cursor + 12;

        if (row.result) {
            doc.fillColor(INK).font('Helvetica').fontSize(8.5)
                .text(row.result, resultX + 8, resultY, {
                    width: COLUMNS.result - 16,
                    height: 24,
                    ellipsis: true
                });

            resultY += 28;
        }

        if (row.label) {
            drawChip(doc, resultX + 8, resultY, row.label, row.labelTone, COLUMNS.result - 16);
        }

        doc.fillColor(INK).font('Helvetica').fontSize(8.5)
            .text(row.timestamp, MARGIN + COLUMNS.image + COLUMNS.result + 8, cursor + ROW_HEIGHT / 2 - 5, {
                width: COLUMNS.timestamp - 16,
                ellipsis: true,
                lineBreak: false
            });

        doc.text(row.location, locationX + 8, cursor + ROW_HEIGHT / 2 - 5, {
            width: locationWidth - 16,
            ellipsis: true,
            lineBreak: false
        });

        cursor += ROW_HEIGHT;

        doc.moveTo(MARGIN, cursor).lineTo(MARGIN + width, cursor).lineWidth(0.5).stroke(BORDER);
    });

    return cursor + 12;
}

export default function buildEventListPDF(context: EventReportContext): PDFKit.PDFDocument {
    const doc = new PDFDocument({size: 'A4', margin: MARGIN, bufferPages: true});

    doc.info.Title = `Event History - ${context.analyticName}`;

    const subtitle = `${context.analyticName} · ${dateText(context.startDate)} to ${dateText(context.endDate)}`;

    let y = drawReportHeader(doc, 'Event History Report', subtitle);

    y = drawDataShowed(doc, y, context);
    y = drawSummary(doc, y, context);

    const scope = context.exportedCount > 0
        ? `Newest ${localeNumber(context.exportedCount)} of ${localeNumber(context.totalData)} events`
        : 'No events in this range';

    y = ensureSpace(doc, y, HEADER_HEIGHT + ROW_HEIGHT + 24);

    doc.fillColor(INK).font('Helvetica-Bold').fontSize(11).text('Event List', MARGIN, y);
    doc.fillColor(MUTED).font('Helvetica').fontSize(8.5)
        .text(scope, MARGIN, y + 14, {width: contentWidth(doc)});

    drawRows(doc, y + 30, context);

    drawFooters(doc, `Event History · ${context.analyticName}`);

    return doc;
}
