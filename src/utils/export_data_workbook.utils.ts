import ExcelJS from "exceljs";
import moment from "moment";
import {ExportDataColumn} from "../services/export_data.service";



export interface ExportDataWorkbookContext {
    startDate: string | null
    endDate: string | null
    cameraNames: string[]
    analyticNames: string[]
    columns: ExportDataColumn[]
    rows: any[]
}

const INK = 'FF1D1E30';
const BLACK = 'FF000000';
const SOFT = 'FFF1F3F5';
const BORDER = 'FFD8DDE3';

const COUNT_FORMAT = '#,##0';
const DURATION_FORMAT = '0.00"s"';

const dateText = (value: string | null): string =>
    value ? moment(value).format('ddd, DD MMM YYYY HH:mm') : '-';

const thinBorder = {style: 'thin' as const, color: {argb: BORDER}};

function writeHeader(sheet: ExcelJS.Worksheet, context: ExportDataWorkbookContext, lastColumn: number): number {
    const span = Math.max(lastColumn, 2);

    sheet.mergeCells(1, 1, 1, span);
    const title = sheet.getCell(1, 1);
    title.value = 'Export Data Report';
    title.font = {bold: true, size: 16, color: {argb: INK}};

    sheet.mergeCells(2, 1, 2, span);
    const generated = sheet.getCell(2, 1);
    generated.value = `Generated ${moment().format('DD MMM YYYY, HH:mm')}`;
    generated.font = {size: 10, color: {argb: BLACK}};

    const entries: Array<[string, string]> = [
        ['Start', dateText(context.startDate)],
        ['End', dateText(context.endDate)],
        ['Camera', context.cameraNames.length > 0 ? context.cameraNames.join(', ') : 'All cameras'],
        ['Analytics', context.analyticNames.length > 0 ? context.analyticNames.join(', ') : 'All analytics'],
        ['Streams', `${context.rows.length}`]
    ];

    let row = 4;

    entries.forEach(([label, value]) => {
        const labelCell = sheet.getCell(row, 1);
        labelCell.value = label;
        labelCell.font = {bold: true, size: 10, color: {argb: BLACK}};
        labelCell.alignment = {vertical: 'top'};

        if (span > 1) sheet.mergeCells(row, 2, row, span);

        const valueCell = sheet.getCell(row, 2);
        valueCell.value = value;
        valueCell.font = {size: 10, color: {argb: INK}};
        valueCell.alignment = {vertical: 'top', wrapText: true};

        row += 1;
    });

    return row + 1;
}


function writeTableHead(sheet: ExcelJS.Worksheet, startRow: number, columns: ExportDataColumn[]): number {
    const groupRow = sheet.getRow(startRow);
    const labelRow = sheet.getRow(startRow + 1);

    sheet.mergeCells(startRow, 1, startRow + 1, 1);

    const streamCell = sheet.getCell(startRow, 1);
    streamCell.value = 'Stream';
    streamCell.font = {bold: true, size: 10, color: {argb: INK}};
    streamCell.alignment = {vertical: 'middle'};
    streamCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: SOFT}};
    streamCell.border = {top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder};

    let index = 0;

    while (index < columns.length) {
        let span = 1;
        while (index + span < columns.length && columns[index + span].group === columns[index].group) span += 1;

        const first = index + 2;
        const last = first + span - 1;

        if (span > 1) sheet.mergeCells(startRow, first, startRow, last);

        const groupCell = sheet.getCell(startRow, first);
        groupCell.value = columns[index].group;
        groupCell.font = {bold: true, size: 10, color: {argb: INK}};
        groupCell.alignment = {horizontal: 'center', vertical: 'middle'};

        for (let column = first; column <= last; column += 1) {
            const cell = sheet.getCell(startRow, column);
            cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: SOFT}};
            cell.border = {top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder};
        }

        index += span;
    }

    columns.forEach((column, columnIndex) => {
        const cell = sheet.getCell(startRow + 1, columnIndex + 2);
        cell.value = column.label;
        cell.font = {bold: true, size: 10, color: {argb: INK}};
        cell.alignment = {horizontal: 'right', vertical: 'middle'};
        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: SOFT}};
        cell.border = {top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder};
    });

    groupRow.height = 18;
    labelRow.height = 18;

    return startRow + 2;
}


function writeTotals(sheet: ExcelJS.Worksheet, row: number, columns: ExportDataColumn[], rows: any[]) {
    const labelCell = sheet.getCell(row, 1);
    labelCell.value = 'TOTAL';
    labelCell.font = {bold: true, size: 10, color: {argb: INK}};
    labelCell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: SOFT}};
    labelCell.border = {top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder};

    columns.forEach((column, index) => {
        const cell = sheet.getCell(row, index + 2);

        if (column.type === 'duration') {
            cell.value = '—';
            cell.alignment = {horizontal: 'right'};
        } else {
            cell.value = rows.reduce((sum, item) => sum + (Number(item[column.key]) || 0), 0);
            cell.numFmt = COUNT_FORMAT;
        }

        cell.font = {bold: true, size: 10, color: {argb: INK}};
        cell.fill = {type: 'pattern', pattern: 'solid', fgColor: {argb: SOFT}};
        cell.border = {top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder};
    });
}

export default async function buildExportDataWorkbook(context: ExportDataWorkbookContext): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();

    workbook.creator = 'Komune Studio';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Export Data', {
        views: [{state: 'frozen', ySplit: 0}]
    });

    const {columns, rows} = context;
    const lastColumn = columns.length + 1;


    sheet.getColumn(1).width = 34;
    columns.forEach((column, index) => {
        sheet.getColumn(index + 2).width = Math.max(12, column.label.length + 4);
    });

    const tableTop = writeHeader(sheet, context, lastColumn);
    const firstDataRow = writeTableHead(sheet, tableTop, columns);

    rows.forEach((row, rowIndex) => {
        const target = firstDataRow + rowIndex;

        const streamCell = sheet.getCell(target, 1);
        streamCell.value = row.stream ?? '-';
        streamCell.font = {size: 10, color: {argb: INK}};
        streamCell.border = {top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder};

        columns.forEach((column, columnIndex) => {
            const cell = sheet.getCell(target, columnIndex + 2);


            cell.value = Number(row[column.key]) || 0;
            cell.numFmt = column.type === 'duration' ? DURATION_FORMAT : COUNT_FORMAT;
            cell.font = {size: 10, color: {argb: INK}};
            cell.border = {top: thinBorder, left: thinBorder, bottom: thinBorder, right: thinBorder};
        });
    });

    if (rows.length > 0 && columns.length > 0) {
        writeTotals(sheet, firstDataRow + rows.length, columns, rows);
    }

    sheet.views = [{state: 'frozen', ySplit: firstDataRow - 1}];
    return Buffer.from(await workbook.xlsx.writeBuffer());
}
