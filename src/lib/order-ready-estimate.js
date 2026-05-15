/** Quick picks when confirming an order (API allows 1–720 minutes). */
export const ESTIMATED_READY_PRESETS = [15, 20, 25, 30];

/**
 * @param {unknown} raw
 * @returns {number | null} Integer minutes 1–720, or null if invalid / empty
 */
export function normalizeEstimatedReadyMinutes(raw) {
  if (raw == null || raw === "") return null;
  const n = Math.round(Number(typeof raw === "string" ? parseInt(raw, 10) : raw));
  if (!Number.isFinite(n) || n < 1 || n > 720) return null;
  return n;
}
