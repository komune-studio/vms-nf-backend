import moment from "moment";

export const MARGIN = 36;
export const INK = '#1D1E30';
export const MUTED = '#666666';
export const BORDER = '#E5E8EB';
export const SOFT = '#F7F8FA';
/** Jarak isi card ke border-nya. */
export const CARD_PADDING = 14;

export interface Tile {
    label: string
    value: string
    hint?: string
    plain?: boolean
}

export const contentWidth = (doc: PDFKit.PDFDocument): number => doc.page.width - MARGIN * 2;

export const bottomLimit = (doc: PDFKit.PDFDocument): number => doc.page.height - MARGIN - 24;

export const numberOf = (value: any): number => Number(value) || 0;

export const localeNumber = (value: any): string => numberOf(value).toLocaleString('id-ID');

export function ensureSpace(doc: PDFKit.PDFDocument, y: number, needed: number): number {
    if (y + needed <= bottomLimit(doc)) return y;

    doc.addPage();

    return MARGIN;
}

export function drawCard(doc: PDFKit.PDFDocument, y: number, height: number, title?: string): number {
    doc.roundedRect(MARGIN, y, contentWidth(doc), height, 6)
        .lineWidth(1)
        .fillAndStroke('#FFFFFF', BORDER);

    if (!title) return y + 14;

    doc.fillColor(INK)
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(title, MARGIN + CARD_PADDING, y + 13, {width: contentWidth(doc) - CARD_PADDING * 2});

    return y + 34;
}

export function drawReportHeader(doc: PDFKit.PDFDocument, title: string, subtitle: string): number {
    const width = contentWidth(doc);

    doc.roundedRect(MARGIN, MARGIN, width, 58, 6).fill(INK);

    doc.fillColor('#FFFFFF')
        .font('Helvetica-Bold')
        .fontSize(15)
        .text(title, MARGIN + 16, MARGIN + 14, {width: width - 32});

    doc.fillColor('#C9CDD6')
        .font('Helvetica')
        .fontSize(9)
        .text(subtitle, MARGIN + 16, MARGIN + 34, {width: width - 32});

    doc.fillColor('#8A90A0')
        .fontSize(8)
        .text(`Generated ${moment().format('DD MMM YYYY, HH:mm')}`, MARGIN + 16, MARGIN + 14, {
            width: width - 32,
            align: 'right'
        });

    return MARGIN + 58 + 14;
}


/** `inset` menjorokkan deretan tile ke dalam card; pakai 0 kalau digambar di luar card. */
export function drawTiles(doc: PDFKit.PDFDocument, y: number, tiles: Tile[], perRow: number, inset = CARD_PADDING): number {
    if (tiles.length === 0) return y;

    const width = contentWidth(doc) - inset * 2;
    const left = MARGIN + inset;
    const gap = 10;
    const tileWidth = (width - gap * (perRow - 1)) / perRow;
    const rowCount = Math.ceil(tiles.length / perRow);
    const tileHeight = tileHeightOf(tiles);

    let cursor = y;

    for (let row = 0; row < rowCount; row += 1) {
        const slice = tiles.slice(row * perRow, row * perRow + perRow);

        slice.forEach((tile, index) => {
            const x = left + (tileWidth + gap) * index;

            if (!tile.plain) doc.roundedRect(x, cursor, tileWidth, tileHeight, 5).fill(SOFT);

            const padding = tile.plain ? 14 : 12;

            doc.fillColor(MUTED).font('Helvetica').fontSize(8.5)
                .text(tile.label, x + padding, cursor + 10, {width: tileWidth - padding * 2, ellipsis: true, lineBreak: false});

            doc.fillColor(INK).font('Helvetica-Bold').fontSize(15)
                .text(tile.value, x + padding, cursor + 24, {width: tileWidth - padding * 2, ellipsis: true, lineBreak: false});

            if (tile.hint) {
                doc.fillColor(MUTED).font('Helvetica').fontSize(7.5)
                    .text(tile.hint, x + padding, cursor + 43, {width: tileWidth - padding * 2, ellipsis: true, lineBreak: false});
            }
        });

        cursor += tileHeight + gap;
    }

    return cursor;
}

export const tileHeightOf = (tiles: Tile[]): number => tiles.some(tile => tile.hint) ? 58 : 48;

export function drawFooters(doc: PDFKit.PDFDocument, label: string) {
    const range = doc.bufferedPageRange();

    for (let index = 0; index < range.count; index += 1) {
        doc.switchToPage(range.start + index);
        const bottomMargin = doc.page.margins.bottom;
        doc.page.margins.bottom = 0;

        const y = doc.page.height - MARGIN + 4;

        doc.fillColor('#A0A6B0').font('Helvetica').fontSize(7.5)
            .text(label || '-', MARGIN, y, {width: contentWidth(doc) / 2, lineBreak: false});

        doc.text(`Page ${index + 1} of ${range.count}`, MARGIN + contentWidth(doc) / 2, y, {
            width: contentWidth(doc) / 2,
            align: 'right',
            lineBreak: false
        });

        doc.page.margins.bottom = bottomMargin;
    }
}

export type DefinitionEntry = [string, string, boolean?];


export function drawDefinitionCard(doc: PDFKit.PDFDocument, y: number, title: string, entries: DefinitionEntry[]): number {
    const valueWidth = contentWidth(doc) - 102;

    doc.font('Helvetica-Bold').fontSize(9);

    const rowHeights = entries.map(([, value, wraps]) =>
        wraps ? Math.max(15, doc.heightOfString(value, {width: valueWidth}) + 3) : 15);

    const height = 34 + rowHeights.reduce((sum, rowHeight) => sum + rowHeight, 0) + 10;
    const top = ensureSpace(doc, y, height);
    const contentTop = drawCard(doc, top, height, title);

    let cursor = contentTop;

    entries.forEach(([label, value, wraps], index) => {
        doc.fillColor(MUTED).font('Helvetica').fontSize(9).text(label, MARGIN + 14, cursor, {width: 70});
        doc.fillColor(INK).font('Helvetica-Bold').fontSize(9)
            .text(value, MARGIN + 88, cursor, wraps
                ? {width: valueWidth}
                : {width: valueWidth, ellipsis: true, lineBreak: false});

        cursor += rowHeights[index];
    });

    return top + height + 12;
}

export function joinNames(names: string[], emptyText: string, max = 20): string {
    if (names.length === 0) return emptyText;
    if (names.length <= max) return names.join(', ');

    return `${names.slice(0, max).join(', ')} +${localeNumber(names.length - max)} more`;
}


export function collectPDF(doc: PDFKit.PDFDocument): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
        const chunks: Buffer[] = [];

        doc.on('data', chunk => chunks.push(chunk as Buffer));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.end();
    });
}
