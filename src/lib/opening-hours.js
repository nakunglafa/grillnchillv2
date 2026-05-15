/**
 * Opening-hour helpers for pickup / online ordering.
 * Times in opening_slots match the restaurant wall clock (see NEXT_PUBLIC_RESTAURANT_TIMEZONE).
 */

export const DEFAULT_RESTAURANT_TIMEZONE =
  process.env.NEXT_PUBLIC_RESTAURANT_TIMEZONE || "Europe/Lisbon";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** @param {string} dateStr YYYY-MM-DD */
export function getDayOfWeekForDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const inst = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return DAY_NAMES[inst.getUTCDay()];
}

/** @param {string|undefined} str */
export function parseTimeToMinutes(str) {
  if (!str || typeof str !== "string") return 0;
  const parts = str.trim().split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  return Number.isNaN(h) ? 0 : h * 60 + m;
}

/**
 * Calendar YYYY-MM-DD minus one day (pure date arithmetic).
 * @param {string} dateStr
 */
export function civilDateMinusOneDay(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const jd = new Date(Date.UTC(y, m - 1, d));
  jd.setUTCDate(jd.getUTCDate() - 1);
  return `${jd.getUTCFullYear()}-${String(jd.getUTCMonth() + 1).padStart(2, "0")}-${String(jd.getUTCDate()).padStart(2, "0")}`;
}

/**
 * @param {Date} date
 * @param {string} timeZone IANA tz
 * @returns {{ dateStr: string, minutes: number }}
 */
export function getZonedCalendarParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const map = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const hour = parseInt(map.hour, 10);
  const minute = parseInt(map.minute, 10);
  return {
    dateStr: `${map.year}-${map.month}-${map.day}`,
    minutes: (Number.isNaN(hour) ? 0 : hour) * 60 + (Number.isNaN(minute) ? 0 : minute),
  };
}

/**
 * Ranges as [openMin, closeMin]. If closeMin < openMin, the range crosses midnight.
 * @param {unknown[]} openingSlots
 * @param {string} dateStr YYYY-MM-DD
 * @returns {Array<[number, number]>}
 */
export function getOpeningRangesForDay(openingSlots, dateStr) {
  if (!openingSlots || openingSlots.length === 0) return [];
  const day = getDayOfWeekForDate(dateStr);
  const daySlots = openingSlots.filter(
    (s) => (s.day_of_week || s.day || "").toString().toLowerCase() === day
  );
  if (daySlots.length === 0) return [];
  const ranges = [];
  const pushRange = (openStr, closeStr) => {
    if (!openStr || !closeStr) return;
    const o = parseTimeToMinutes(openStr);
    const c = parseTimeToMinutes(closeStr);
    if (o === c) return;
    ranges.push([o, c]);
  };
  daySlots.forEach((s) => {
    pushRange(s.open_time || s.open || s.from, s.close_time || s.close || s.to);
    pushRange(s.open_time_2 || s.open_2 || s.second_open, s.close_time_2 || s.close_2 || s.second_close);
    if (Array.isArray(s.shifts)) {
      s.shifts.forEach((sh) => pushRange(sh.open_time || sh.open || sh.from, sh.close_time || sh.close || sh.to));
    }
    if (Array.isArray(s.slots)) {
      s.slots.forEach((sh) => pushRange(sh.open_time || sh.open || sh.from, sh.close_time || sh.close || sh.to));
    }
  });
  return ranges;
}

/**
 * @param {Array<[number, number]>} ranges
 * @param {number} minutes
 */
export function isMinutesInRanges(ranges, minutes) {
  if (!ranges || ranges.length === 0) return false;
  return ranges.some(([a, b]) => {
    if (b > a) return minutes >= a && minutes < b;
    return minutes >= a || minutes < b;
  });
}

/**
 * Early morning after midnight: still inside previous day's session when it crossed midnight.
 * @param {unknown[]} openingSlots
 * @param {string} priorDateStr YYYY-MM-DD (yesterday in restaurant calendar)
 * @param {number} minutes
 */
export function isOvernightMorningFromPriorDay(openingSlots, priorDateStr, minutes) {
  const ranges = getOpeningRangesForDay(openingSlots, priorDateStr);
  return ranges.some(([a, b]) => b < a && minutes < b);
}

/**
 * @param {unknown[]} openingSlots
 * @param {string} [timeZone]
 * @param {Date} [now]
 * @returns {boolean} true = ordering allowed; if there are no slots, ordering is allowed (same as booking UX).
 */
export function isRestaurantOpenForOrdering(openingSlots, timeZone = DEFAULT_RESTAURANT_TIMEZONE, now = new Date()) {
  if (!openingSlots || openingSlots.length === 0) return true;
  const { dateStr, minutes } = getZonedCalendarParts(now, timeZone);
  const todayRanges = getOpeningRangesForDay(openingSlots, dateStr);
  if (isMinutesInRanges(todayRanges, minutes)) return true;
  const prior = civilDateMinusOneDay(dateStr);
  return isOvernightMorningFromPriorDay(openingSlots, prior, minutes);
}

/**
 * Website/API payload may expose hours at the root (next to `restaurant`) or nested under `restaurant` / `data`.
 * @param {unknown} node
 * @returns {unknown[] | null}
 */
function readOpeningSlotsFromNode(node) {
  if (!node || typeof node !== "object") return null;
  const s = node.opening_hours?.opening_slots;
  return Array.isArray(s) ? s : null;
}

/**
 * @param {unknown} apiPayload getRestaurant() JSON (e.g. `{ restaurant, opening_hours: { opening_slots } }`)
 * @returns {unknown[]}
 */
export function extractOpeningSlotsFromRestaurantPayload(apiPayload) {
  if (!apiPayload || typeof apiPayload !== "object") return [];
  return (
    readOpeningSlotsFromNode(apiPayload) ??
    readOpeningSlotsFromNode(apiPayload.data) ??
    readOpeningSlotsFromNode(apiPayload.restaurant) ??
    readOpeningSlotsFromNode(apiPayload.data?.restaurant) ??
    []
  );
}
