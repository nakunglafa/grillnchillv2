/**
 * Convert Laravel opening_slots into schema.org OpeningHoursSpecification rows.
 * Overnight closes (e.g. 12:00–00:30) are split across two days so Google
 * does not treat 00:30 as the same calendar morning.
 * @param {Array<{ day_of_week?: string, day?: string, open_time?: string, close_time?: string }>} slots
 */
export function openingSlotsToSchema(slots) {
  if (!Array.isArray(slots) || slots.length === 0) return undefined;
  const dayMap = {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
  };
  const order = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  const nextDay = (day) => order[(order.indexOf(day) + 1) % 7];
  const toMinutes = (hhmm) => {
    const [h, m] = String(hhmm).split(":").map((n) => Number(n));
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };

  const out = [];
  for (const slot of slots) {
    const raw = String(slot.day_of_week || slot.day || "")
      .toLowerCase()
      .trim();
    const day = dayMap[raw];
    if (!day) continue;
    const opens = String(slot.open_time || "").slice(0, 5);
    const closes = String(slot.close_time || "").slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(opens) || !/^\d{2}:\d{2}$/.test(closes)) continue;
    const openM = toMinutes(opens);
    const closeM = toMinutes(closes);
    if (openM == null || closeM == null) continue;
    if (closeM <= openM) {
      out.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: day,
        opens,
        closes: "24:00",
      });
      out.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: nextDay(day),
        opens: "00:00",
        closes,
      });
    } else {
      out.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: day,
        opens,
        closes,
      });
    }
  }
  return out.length ? out : undefined;
}
