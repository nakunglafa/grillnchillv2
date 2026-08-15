/**
 * Cake sample URL helpers (safe for client + server).
 */

export const CAKE_SAMPLE_API_PREFIX = "/api/cake-sample";

/** Safe filename: 12–64 hex chars + .jpg */
export function isSafeCakeSampleFilename(name) {
  return /^[a-f0-9]{12,64}\.jpe?g$/i.test(String(name || "").trim());
}

/**
 * Extract cake sample filename from a full URL, relative path, or notes blob.
 * @param {string} urlOrNotes
 * @returns {string|null}
 */
export function parseCakeSampleFilename(urlOrNotes) {
  const text = String(urlOrNotes || "");
  const fromNotes = text.match(/Sample image:\s*(\S+)/i)?.[1] || text;
  const m =
    String(fromNotes).match(/\/api\/cake-sample\/([a-f0-9]+\.jpe?g)/i) ||
    String(fromNotes).match(/\/uploads\/cake-samples\/([a-f0-9]+\.jpe?g)/i) ||
    String(fromNotes).match(/(?:^|[^\w/])([a-f0-9]{12,64}\.jpe?g)(?:$|[^\w])/i);
  const name = (m?.[1] || "").toLowerCase().replace(/\.jpeg$/i, ".jpg");
  return name && isSafeCakeSampleFilename(name) ? name : null;
}

/**
 * Browser-facing URL for a stored sample — always points at the current Next origin
 * so staff see the file on the same server that received the upload.
 * @param {string} pathOrUrl
 * @returns {string}
 */
export function resolveCakeSampleDisplayUrl(pathOrUrl) {
  const raw = String(pathOrUrl || "").trim();
  if (!raw) return "";
  const filename = parseCakeSampleFilename(raw);
  if (filename) {
    const pathOnly = `${CAKE_SAMPLE_API_PREFIX}/${filename}`;
    if (typeof window !== "undefined" && window.location?.origin) {
      return `${window.location.origin}${pathOnly}`;
    }
    return pathOnly;
  }
  if (/^https?:\/\//i.test(raw)) return raw;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
  }
  return raw;
}

/**
 * Persistable sample URL for order notes (absolute to current site origin when in browser).
 * @param {string} pathOrUrl
 * @returns {string}
 */
export function toCakeSampleNotesUrl(pathOrUrl) {
  const filename = parseCakeSampleFilename(pathOrUrl);
  if (!filename) return String(pathOrUrl || "").trim();
  const pathOnly = `${CAKE_SAMPLE_API_PREFIX}/${filename}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${pathOnly}`;
  }
  return pathOnly;
}

/**
 * Delete sample file from Next disk after order is finished. Order history is untouched.
 * @param {string} token
 * @param {string} notesOrUrl
 */
export async function deleteCakeSampleFile(token, notesOrUrl) {
  const filename = parseCakeSampleFilename(notesOrUrl);
  if (!filename || !token) return { deleted: false };
  try {
    const res = await fetch(`${CAKE_SAMPLE_API_PREFIX}/${filename}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return { deleted: false };
    const data = await res.json().catch(() => ({}));
    return { deleted: !!data?.deleted || res.ok };
  } catch {
    return { deleted: false };
  }
}
