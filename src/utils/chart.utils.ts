import {CanvasRenderingContext2D, createCanvas} from "canvas";


const SCALE = 2;

const FONT = 'sans-serif';
const TEXT_COLOR = '#1D1E30';
const MUTED_COLOR = '#919EAB';
const GRID_COLOR = '#EDF0F3';
const AXIS_COLOR = '#DDE2E7';

export interface ChartSeries {
    name: string
    data: number[]
}

export interface CartesianChartOptions {
    categories: string[]
    series: ChartSeries[]
    colors: string[]
    type: 'bar' | 'line'
    stacked?: boolean
    width?: number
    height?: number
    legend?: boolean
    maxXLabels?: number
    valueFormat?: (value: number) => string
}

export interface HeatmapOptions {
    xCategories: string[]
    yCategories: string[]
    data: number[][]
    width?: number
    valueFormat?: (value: number) => string
}


export interface RenderedImage {
    buffer: Buffer
    width: number
    height: number
}

const formatCount = (value: number): string => {
    if (!Number.isFinite(value)) return '0';

    return Math.round(value * 100) / 100 === Math.round(value)
        ? Math.round(value).toLocaleString('en-US')
        : (Math.round(value * 100) / 100).toLocaleString('en-US');
};

function beginCanvas(width: number, height: number) {
    const canvas = createCanvas(width * SCALE, height * SCALE);
    const ctx = canvas.getContext('2d');

    ctx.scale(SCALE, SCALE);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.textBaseline = 'alphabetic';

    return {canvas, ctx};
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
}


function niceTicks(max: number, desired = 5): number[] {
    if (!Number.isFinite(max) || max <= 0) return [0, 1];

    const rawStep = max / desired;
    const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
    const normalized = rawStep / magnitude;
    const step = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 2.5 ? 2.5 : normalized <= 5 ? 5 : 10) * magnitude;

    const ticks: number[] = [];
    for (let value = 0; value <= max + step / 2; value += step) {
        ticks.push(Number(value.toFixed(10)));
    }

    if (ticks.length < 2) ticks.push(step);

    return ticks;
}

function drawNoData(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.fillStyle = MUTED_COLOR;
    ctx.font = `14px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText('No Data Available', width / 2, height / 2);
    ctx.textAlign = 'left';
}

function drawLegend(ctx: CanvasRenderingContext2D, series: ChartSeries[], colors: string[], x: number, y: number) {
    ctx.font = `12px ${FONT}`;
    ctx.textAlign = 'left';

    let cursor = x;

    series.forEach((entry, index) => {
        ctx.fillStyle = colors[index % colors.length];
        ctx.beginPath();
        ctx.arc(cursor + 5, y - 4, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = TEXT_COLOR;
        ctx.fillText(entry.name, cursor + 15, y);

        cursor += 15 + ctx.measureText(entry.name).width + 18;
    });
}

export function renderCartesianChart(options: CartesianChartOptions): Buffer {
    const width = options.width ?? 920;
    const height = options.height ?? 340;
    const legend = options.legend ?? options.series.length > 1;
    const valueFormat = options.valueFormat ?? formatCount;
    const maxXLabels = options.maxXLabels ?? 12;

    const {canvas, ctx} = beginCanvas(width, height);

    const categories = options.categories ?? [];
    const series = (options.series ?? []).filter(entry => Array.isArray(entry.data));

    if (categories.length === 0 || series.length === 0) {
        drawNoData(ctx, width, height);
        return canvas.toBuffer('image/png');
    }

    let peak = 0;
    if (options.stacked) {
        categories.forEach((_, index) => {
            const total = series.reduce((sum, entry) => sum + (Number(entry.data[index]) || 0), 0);
            if (total > peak) peak = total;
        });
    } else {
        series.forEach(entry => entry.data.forEach(value => {
            const numeric = Number(value) || 0;
            if (numeric > peak) peak = numeric;
        }));
    }

    const ticks = niceTicks(peak);
    const axisMax = ticks[ticks.length - 1];

    ctx.font = `11px ${FONT}`;
    const yLabelWidth = Math.max(...ticks.map(tick => ctx.measureText(valueFormat(tick)).width));

    const labelStep = Math.max(1, Math.ceil(categories.length / maxXLabels));
    const visibleLabels = categories.filter((_, index) => index % labelStep === 0);
    const longestLabel = Math.max(...visibleLabels.map(label => ctx.measureText(String(label)).width));

    const plotLeft = 16 + yLabelWidth + 10;
    const plotRight = width - 20;
    const plotTop = legend ? 36 : 16;
    const slotWidth = (plotRight - plotLeft) / categories.length;

    const rotate = longestLabel > slotWidth * labelStep - 6;
    const bottomSpace = rotate ? Math.min(90, longestLabel * 0.75 + 18) : 28;
    const plotBottom = height - bottomSpace;
    const plotHeight = plotBottom - plotTop;

    if (legend) drawLegend(ctx, series, options.colors, plotLeft, plotTop - 16);

    const yOf = (value: number) => plotBottom - (value / axisMax) * plotHeight;

    // Garis bantu + label sumbu-Y
    ctx.font = `11px ${FONT}`;
    ctx.textAlign = 'right';
    ticks.forEach(tick => {
        const y = yOf(tick);

        ctx.strokeStyle = GRID_COLOR;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(plotLeft, y);
        ctx.lineTo(plotRight, y);
        ctx.stroke();

        ctx.fillStyle = MUTED_COLOR;
        ctx.fillText(valueFormat(tick), plotLeft - 10, y + 4);
    });
    ctx.textAlign = 'left';

    // Sumbu dasar
    ctx.strokeStyle = AXIS_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(plotLeft, plotBottom);
    ctx.lineTo(plotRight, plotBottom);
    ctx.stroke();

    if (options.type === 'bar') {
        drawBars(ctx, {categories, series, colors: options.colors, stacked: options.stacked ?? false, plotLeft, plotBottom, slotWidth, yOf});
    } else {
        drawLines(ctx, {categories, series, colors: options.colors, plotLeft, plotBottom, plotTop, slotWidth, yOf});
    }

    // Label sumbu-X
    ctx.font = `11px ${FONT}`;
    ctx.fillStyle = MUTED_COLOR;

    categories.forEach((label, index) => {
        if (index % labelStep !== 0) return;

        const centerX = plotLeft + slotWidth * (index + 0.5);
        const text = String(label);

        if (rotate) {
            ctx.save();
            ctx.translate(centerX, plotBottom + 12);
            ctx.rotate(-Math.PI / 4);
            ctx.textAlign = 'right';
            ctx.fillText(text, 0, 0);
            ctx.restore();
        } else {
            ctx.textAlign = 'center';
            ctx.fillText(text, centerX, plotBottom + 16);
        }
    });

    ctx.textAlign = 'left';

    return canvas.toBuffer('image/png');
}

interface BarContext {
    categories: string[]
    series: ChartSeries[]
    colors: string[]
    stacked: boolean
    plotLeft: number
    plotBottom: number
    slotWidth: number
    yOf: (value: number) => number
}

function drawBars(ctx: CanvasRenderingContext2D, context: BarContext) {
    const {categories, series, colors, stacked, plotLeft, plotBottom, slotWidth, yOf} = context;

    const groupWidth = Math.max(2, slotWidth * 0.62);
    const barWidth = stacked ? groupWidth : Math.max(1.5, groupWidth / series.length);

    categories.forEach((_, index) => {
        const slotStart = plotLeft + slotWidth * index + (slotWidth - groupWidth) / 2;
        let stackTop = plotBottom;

        series.forEach((entry, seriesIndex) => {
            const value = Number(entry.data[index]) || 0;
            if (value <= 0) return;

            const barHeight = plotBottom - yOf(value);
            const x = stacked ? slotStart : slotStart + barWidth * seriesIndex;
            const y = stacked ? stackTop - barHeight : plotBottom - barHeight;

            ctx.fillStyle = colors[seriesIndex % colors.length];

            const isTop = !stacked || series.slice(seriesIndex + 1)
                .every(rest => (Number(rest.data[index]) || 0) <= 0);

            if (isTop && barHeight > 3) {
                roundedRect(ctx, x, y, stacked ? barWidth : barWidth * 0.86, barHeight, Math.min(4, barWidth / 3));
                ctx.fill();
            } else {
                ctx.fillRect(x, y, stacked ? barWidth : barWidth * 0.86, barHeight);
            }

            if (stacked) stackTop -= barHeight;
        });
    });
}

interface LineContext {
    categories: string[]
    series: ChartSeries[]
    colors: string[]
    plotLeft: number
    plotBottom: number
    plotTop: number
    slotWidth: number
    yOf: (value: number) => number
}

function drawLines(ctx: CanvasRenderingContext2D, context: LineContext) {
    const {categories, series, colors, plotLeft, plotBottom, plotTop, slotWidth, yOf} = context;

    series.forEach((entry, seriesIndex) => {
        const color = colors[seriesIndex % colors.length];
        const points = categories.map((_, index) => ({
            x: plotLeft + slotWidth * (index + 0.5),
            y: yOf(Number(entry.data[index]) || 0)
        }));

        if (points.length === 0) return;

        const gradient = ctx.createLinearGradient(0, plotTop, 0, plotBottom);
        gradient.addColorStop(0, hexToRgba(color, 0.38));
        gradient.addColorStop(1, hexToRgba(color, 0.02));

        ctx.beginPath();
        ctx.moveTo(points[0].x, plotBottom);
        points.forEach(point => ctx.lineTo(point.x, point.y));
        ctx.lineTo(points[points.length - 1].x, plotBottom);
        ctx.closePath();
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        points.forEach((point, index) => index === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.stroke();
        if (points.length <= 40) {
            points.forEach(point => {
                ctx.beginPath();
                ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
                ctx.fillStyle = '#FFFFFF';
                ctx.fill();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.stroke();
            });
        }
    });
}

function hexToRgba(hex: string, alpha: number): string {
    const normalized = hex.replace('#', '');
    const full = normalized.length === 3
        ? normalized.split('').map(char => char + char).join('')
        : normalized;

    const value = parseInt(full, 16);

    if (Number.isNaN(value)) return `rgba(0, 172, 238, ${alpha})`;

    return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`;
}

export function renderHeatmap(options: HeatmapOptions): RenderedImage {
    const {xCategories, yCategories, data} = options;
    const valueFormat = options.valueFormat ?? formatCount;

    const width = options.width ?? 1100;

    if (yCategories.length === 0 || xCategories.length === 0) {
        const {canvas, ctx} = beginCanvas(width, 160);
        drawNoData(ctx, width, 160);
        return {buffer: canvas.toBuffer('image/png'), width, height: 160};
    }

    const probe = createCanvas(10, 10).getContext('2d');
    probe.font = `11px ${FONT}`;
    const yLabelWidth = Math.max(...yCategories.map(label => probe.measureText(String(label)).width));

    const plotLeft = yLabelWidth + 22;
    const legendWidth = 58;
    const plotRight = width - legendWidth;
    const cellWidth = (plotRight - plotLeft) / xCategories.length;
    const cellHeight = Math.max(20, Math.min(34, cellWidth * 0.85));

    const plotTop = 14;
    const bottomSpace = 76;
    const height = plotTop + cellHeight * yCategories.length + bottomSpace;

    const {canvas, ctx} = beginCanvas(width, height);

    let peak = 0;
    data.forEach(row => row.forEach(value => {
        const numeric = Number(value) || 0;
        if (numeric > peak) peak = numeric;
    }));

    const colorOf = (value: number): string => {
        const ratio = peak > 0 ? Math.min(1, Math.max(0, value / peak)) : 0;

        // #FFFFFF -> #da4d33
        const r = Math.round(255 + (218 - 255) * ratio);
        const g = Math.round(255 + (77 - 255) * ratio);
        const b = Math.round(255 + (51 - 255) * ratio);

        return `rgb(${r}, ${g}, ${b})`;
    };

    yCategories.forEach((label, y) => {
        const top = plotTop + cellHeight * y;

        xCategories.forEach((_, x) => {
            const value = Number(data[y]?.[x]) || 0;
            const left = plotLeft + cellWidth * x;

            ctx.fillStyle = colorOf(value);
            ctx.fillRect(left, top, cellWidth, cellHeight);

            ctx.strokeStyle = '#E3E6E9';
            ctx.lineWidth = 1;
            ctx.strokeRect(left, top, cellWidth, cellHeight);

            const text = valueFormat(value);
            ctx.font = `9px ${FONT}`;

            if (ctx.measureText(text).width < cellWidth - 4) {
                ctx.fillStyle = (peak > 0 && value / peak > 0.62) ? '#FFFFFF' : '#000000';
                ctx.textAlign = 'center';
                ctx.fillText(text, left + cellWidth / 2, top + cellHeight / 2 + 3);
            }
        });

        ctx.font = `11px ${FONT}`;
        ctx.fillStyle = TEXT_COLOR;
        ctx.textAlign = 'right';
        ctx.fillText(String(label), plotLeft - 10, top + cellHeight / 2 + 4);
    });

    // Label jam, diputar 90 derajat supaya "00:01 - 01:00" tetap terbaca.
    const gridBottom = plotTop + cellHeight * yCategories.length;
    ctx.font = `9px ${FONT}`;
    ctx.fillStyle = MUTED_COLOR;

    xCategories.forEach((label, x) => {
        ctx.save();
        ctx.translate(plotLeft + cellWidth * (x + 0.5) + 3, gridBottom + 8);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'right';
        ctx.fillText(String(label), 0, 0);
        ctx.restore();
    });

    drawHeatmapLegend(ctx, {
        x: plotRight + 16,
        y: plotTop,
        height: Math.max(60, gridBottom - plotTop),
        peak,
        colorOf,
        valueFormat
    });

    return {buffer: canvas.toBuffer('image/png'), width, height};
}

interface HeatmapLegendContext {
    x: number
    y: number
    height: number
    peak: number
    colorOf: (value: number) => string
    valueFormat: (value: number) => string
}

function drawHeatmapLegend(ctx: CanvasRenderingContext2D, context: HeatmapLegendContext) {
    const {x, y, height, peak, colorOf, valueFormat} = context;
    const barWidth = 12;
    const steps = 60;

    for (let step = 0; step < steps; step += 1) {
        const ratio = 1 - step / (steps - 1);
        const segmentHeight = height / steps;

        ctx.fillStyle = colorOf(ratio * peak);
        ctx.fillRect(x, y + segmentHeight * step, barWidth, segmentHeight + 0.5);
    }

    ctx.strokeStyle = '#E3E6E9';
    ctx.lineWidth = 1;
    ctx.strokeRect(x, y, barWidth, height);

    ctx.font = `10px ${FONT}`;
    ctx.fillStyle = MUTED_COLOR;
    ctx.textAlign = 'left';
    ctx.fillText(valueFormat(peak), x + barWidth + 5, y + 8);
    ctx.fillText('0', x + barWidth + 5, y + height);
}
