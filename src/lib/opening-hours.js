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

/**
 * @param {string} dateStr YYYY-MM-DD
 * @returns {boolean}
 */
export function isDayOpenForOrdering(openingSlots, dateStr) {
  if (!openingSlots || openingSlots.length === 0) return true;
  return getOpeningRangesForDay(openingSlots, dateStr).length > 0;
}

/**
 * Build YYYY-MM-DD options for the next open days (calendar horizon search).
 * @param {unknown[]} openingSlots
 * @param {number} [maxOpenDays=7]
 * @param {string} [timeZone]
 * @param {Date} [now]
 * @returns {{ value: string, label: string }[]}
 */
export function buildOrderScheduleDateOptions(
  openingSlots,
  maxOpenDays = 7,
  timeZone = DEFAULT_RESTAURANT_TIMEZONE,
  now = new Date()
) {
  const { dateStr: today } = getZonedCalendarParts(now, timeZone);
  const options = [];
  let cursor = today;
  let scanned = 0;
  while (options.length < maxOpenDays && scanned < 21) {
    if (isDayOpenForOrdering(openingSlots, cursor)) {
      const [y, m, d] = cursor.split("-").map(Number);
      const labelDate = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
      const label = labelDate.toLocaleDateString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
      options.push({ value: cursor, label });
    }
    const [y, m, d] = cursor.split("-").map(Number);
    const next = new Date(Date.UTC(y, m - 1, d));
    next.setUTCDate(next.getUTCDate() + 1);
    cursor = `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-${String(next.getUTCDate()).padStart(2, "0")}`;
    scanned += 1;
  }
  return options;
}

/**
 * 15-minute HH:mm slots inside opening ranges for a day.
 * Past times (and within minLeadMinutes) are filtered out for "today".
 * @param {unknown[]} openingSlots
 * @param {string} dateStr
 * @param {{ timeZone?: string, now?: Date, stepMinutes?: number, minLeadMinutes?: number }} [opts]
 * @returns {string[]}
 */
export function getOrderScheduleTimeSlots(
  openingSlots,
  dateStr,
  {
    timeZone = DEFAULT_RESTAURANT_TIMEZONE,
    now = new Date(),
    stepMinutes = 15,
    minLeadMinutes = 15,
  } = {}
) {
  const ranges = getOpeningRangesForDay(openingSlots, dateStr);
  if (!ranges.length) {
    // No configured hours → allow full day grid (same permissive spirit as booking)
    const slots = [];
    for (let m = 0; m < 24 * 60; m += stepMinutes) {
      slots.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
    }
    return filterScheduleSlotsByLead(slots, dateStr, timeZone, now, minLeadMinutes);
  }

  const slots = [];
  const seen = new Set();
  for (const [openMin, closeMin] of ranges) {
    if (closeMin > openMin) {
      for (let m = openMin; m < closeMin; m += stepMinutes) {
        const label = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        if (!seen.has(label)) {
          seen.add(label);
          slots.push(label);
        }
      }
    } else {
      // Overnight: from open to midnight, then 00:00 to close (close belongs to next calendar morning —
      // those morning minutes are on the *next* date via prior-day window; for this date only evening+).
      for (let m = openMin; m < 24 * 60; m += stepMinutes) {
        const label = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        if (!seen.has(label)) {
          seen.add(label);
          slots.push(label);
        }
      }
    }
  }
  // Morning portion of overnight from prior day
  const prior = civilDateMinusOneDay(dateStr);
  const priorRanges = getOpeningRangesForDay(openingSlots, prior);
  for (const [openMin, closeMin] of priorRanges) {
    if (closeMin < openMin) {
      for (let m = 0; m < closeMin; m += stepMinutes) {
        const label = `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
        if (!seen.has(label)) {
          seen.add(label);
          slots.push(label);
        }
      }
    }
  }
  slots.sort();
  return filterScheduleSlotsByLead(slots, dateStr, timeZone, now, minLeadMinutes);
}

/**
 * @param {string[]} slots HH:mm
 * @param {string} dateStr
 * @param {string} timeZone
 * @param {Date} now
 * @param {number} minLeadMinutes
 */
function filterScheduleSlotsByLead(slots, dateStr, timeZone, now, minLeadMinutes) {
  const { dateStr: today, minutes: nowMins } = getZonedCalendarParts(now, timeZone);
  const lead = Math.max(0, Number(minLeadMinutes) || 0);

  // Same calendar day: filter by minutes-from-midnight + lead
  if (dateStr === today) {
    const minMins = nowMins + lead;
    return slots.filter((hhmm) => parseTimeToMinutes(hhmm) >= minMins);
  }

  // Multi-day lead (e.g. custom cake 48h): compare wall-clock datetimes
  if (lead <= 24 * 60) {
    // Within ~1 day past "today", any future date is fine once lead < 1 day beyond today
    const [ty, tm, td] = today.split("-").map(Number);
    const [dy, dm, dd] = dateStr.split("-").map(Number);
    const todayUtc = Date.UTC(ty, tm - 1, td);
    const dateUtc = Date.UTC(dy, dm - 1, dd);
    const dayDiff = Math.round((dateUtc - todayUtc) / (24 * 60 * 60 * 1000));
    if (dayDiff > 1) return slots;
    if (dayDiff < 0) return [];
    // Tomorrow with lead that spills past midnight: require slot >= (nowMins + lead - 1440)
    const spill = nowMins + lead - 24 * 60;
    if (spill <= 0) return slots;
    return slots.filter((hhmm) => parseTimeToMinutes(hhmm) >= spill);
  }

  // Long lead (48h+): earliest allowed = now + lead
  const earliest = new Date(now.getTime() + lead * 60 * 1000);
  const { dateStr: earliestDate, minutes: earliestMins } = getZonedCalendarParts(earliest, timeZone);
  if (dateStr < earliestDate) return [];
  if (dateStr > earliestDate) return slots;
  return slots.filter((hhmm) => parseTimeToMinutes(hhmm) >= earliestMins);
}

/**
 * Build ISO-like local datetime string for API (Europe/Lisbon wall clock).
 * @param {string} dateStr YYYY-MM-DD
 * @param {string} timeStr HH:mm
 * @returns {string} e.g. 2026-08-10 19:30:00
 */
export function formatScheduledForPayload(dateStr, timeStr) {
  const t = timeStr.length === 5 ? `${timeStr}:00` : timeStr;
  return `${dateStr} ${t}`;
}
