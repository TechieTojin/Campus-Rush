// Estimated pickup time.
//
// Deliberately simple and explainable — every input is something the canteen actually controls or
// the server already knows. There is no machine learning and no fake precision: the result is a
// minute count the student app shows as an approximate window, never a promise.
//
//   base   the slowest dish in the order (a kitchen cooks the items in one order side by side,
//          so summing every dish's prep time would badly overstate a 4-item order)
//   batch  +2 minutes for every extra 4 units, because volume does slow a kitchen down
//   queue  +1.5 minutes per order already being worked on at that canteen, capped at 10 orders
//
// Staff can override the result per order (see prepDelayMinutes / estimate overrides in the
// pickup controller). An override always wins over this calculation.

const DEFAULT_PREP_MINUTES = 10;
const MIN_MINUTES = 3;
const MAX_MINUTES = 120;
const MAX_QUEUE_COUNTED = 10;
const MINUTES_PER_QUEUED_ORDER = 1.5;
const UNITS_PER_BATCH = 4;
const MINUTES_PER_BATCH = 2;

const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

// Default prep time for a canteen, falling back to the platform default.
const canteenDefault = (canteen) => {
    const n = canteen && Number(canteen.defaultPrepTime);
    return Number.isFinite(n) && n >= 1 && n <= 240 ? n : DEFAULT_PREP_MINUTES;
};

// items: the menu documents being ordered, with { prepTime }
// units: total number of units in the order
// queueAhead: how many orders are already Placed/Processing at this canteen
function computeMinutes({ items = [], units = 1, canteen, queueAhead = 0 }) {
    const fallback = canteenDefault(canteen);
    const prepTimes = items
        .map(it => (it && Number.isFinite(Number(it.prepTime)) && Number(it.prepTime) > 0 ? Number(it.prepTime) : fallback));
    const base = prepTimes.length ? Math.max(...prepTimes) : fallback;

    const extraUnits = Math.max(0, units - 1);
    const batch = Math.ceil(extraUnits / UNITS_PER_BATCH) * MINUTES_PER_BATCH;

    const queue = Math.round(Math.min(Math.max(0, queueAhead), MAX_QUEUE_COUNTED) * MINUTES_PER_QUEUED_ORDER);

    const minutes = clamp(Math.round(base + batch + queue), MIN_MINUTES, MAX_MINUTES);
    return { minutes, breakdown: { base, batch, queue, units, queueAhead: Math.max(0, queueAhead) } };
}

const readyAtFrom = (from, minutes) => new Date(new Date(from).getTime() + minutes * 60000);

// Minutes remaining from now until a timestamp (negative when it has passed).
const minutesUntil = (when) => (when ? Math.round((new Date(when).getTime() - Date.now()) / 60000) : null);

module.exports = {
    DEFAULT_PREP_MINUTES,
    MIN_MINUTES,
    MAX_MINUTES,
    canteenDefault,
    computeMinutes,
    readyAtFrom,
    minutesUntil,
};
