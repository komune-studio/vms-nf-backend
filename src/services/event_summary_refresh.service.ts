import EventSummaryDAO from "../daos/event_summary.dao";

const HOUR_MS = 3600 * 1000;
const DAY_MS = 24 * HOUR_MS;

const INTERVAL_MS = 5 * 60 * 1000;
const LOOKBACK_HOURS = 3;
const SETTLE_MS = 10 * 60 * 1000;

let summarizedUntil: Date | null = null;
let running = false;

export const getSummarizedUntil = () => summarizedUntil;

const floorHour = (ms: number) => Math.floor(ms / HOUR_MS) * HOUR_MS;

const resolveFrom = async (now: number) => {
    const recent = floorHour(now) - LOOKBACK_HOURS * HOUR_MS;

    if (summarizedUntil) return Math.min(recent, summarizedUntil.getTime());

    const latest = await EventSummaryDAO.getLatestHour();

    if (latest) return Math.min(recent, latest.getTime() - LOOKBACK_HOURS * HOUR_MS);

    const bounds = await EventSummaryDAO.getEventTimeBounds();

    return bounds.min ? floorHour(bounds.min.getTime()) : recent;
};

const refreshOnce = async () => {
    if (running) return;

    running = true;

    const startedAt = Date.now();

    try {
        const from = await resolveFrom(startedAt);
        const to = floorHour(startedAt) + HOUR_MS;

        for (let start = from; start < to; start += DAY_MS) {
            await EventSummaryDAO.refresh(new Date(start), new Date(Math.min(start + DAY_MS, to)));
        }

        summarizedUntil = new Date(floorHour(startedAt - SETTLE_MS));
    } catch (e) {
        console.log('event_summary_hourly refresh failed:', e);
    } finally {
        running = false;
    }
};

export function startEventSummaryRefresh() {
    const loop = async () => {
        await refreshOnce();
        setTimeout(loop, INTERVAL_MS);
    };

    loop();
}
