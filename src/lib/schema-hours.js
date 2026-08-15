/**
 * Convert Laravel opening_slots into schema.org OpeningHoursSpecification rows.
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
    out.push({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: day,
      opens,
      closes,
    });
  }
  return out.length ? out : undefined;
}
