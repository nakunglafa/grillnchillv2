/**
 * Custom cake order helpers (bakery).
 */

export const CUSTOM_CAKE_MIN_LEAD_MINUTES = 48 * 60;

/** Preferred display order for bakery cake flavours. */
export const BAKERY_CAKE_FLAVOR_ORDER = [
  "Chocolate",
  "Vanilla",
  "Black Forest",
  "White Forest",
  "Mixed Fruits",
  "Pineapple",
  "Strawberry",
  "Rich Chocolate",
  "Blueberry",
  "Red Velvet",
  "Mocca",
  "Mini Opera",
];

/**
 * @param {unknown} node
 * @param {(item: object) => void} visit
 */
function walkMenuItems(node, visit) {
  if (!node) return;
  if (Array.isArray(node)) {
    for (const n of node) walkMenuItems(n, visit);
    return;
  }
  if (typeof node !== "object") return;
  const items = node.items ?? node.menu_items;
  if (Array.isArray(items)) {
    for (const item of items) {
      if (item && typeof item === "object") visit(item);
    }
  }
  const children = node.children ?? node.categories ?? node.subcategories;
  if (Array.isArray(children)) {
    for (const child of children) walkMenuItems(child, visit);
  }
  if (Array.isArray(node.menus)) {
    for (const menu of node.menus) walkMenuItems(menu, visit);
  }
}

function isKgVariant(variant) {
  const name = String(variant?.type_name ?? variant?.name ?? "").toLowerCase();
  return /\bkg\b|½\s*kg|1\/2\s*kg|0\.5\s*kg/.test(name) || name.includes("kg");
}

/**
 * Extract orderable cakes (flavours with kg size variants) from restaurant menus.
 * @param {unknown} menus
 * @returns {Array<{
 *   id: number,
 *   name: string,
 *   imageUrl: string,
 *   variants: Array<{ id: number|null, typeName: string, price: number }>,
 *   fromPrice: number,
 * }>}
 */
export function extractBakeryCakes(menus) {
  const byId = new Map();

  walkMenuItems({ menus }, (item) => {
    const id = Number(item.id);
    if (!id || Number.isNaN(id)) return;
    const variantsRaw = Array.isArray(item.variants) ? item.variants : [];
    const kgVariants = variantsRaw
      .filter((v) => v && v.is_available !== false && isKgVariant(v))
      .map((v) => ({
        id: v.id != null ? Number(v.id) : null,
        typeName: String(v.type_name ?? v.name ?? "").trim() || "Size",
        price: parseFloat(v.price) || 0,
      }))
      .filter((v) => v.price > 0)
      .sort((a, b) => a.price - b.price);

    if (kgVariants.length === 0) return;

    const name = String(item.name || "").trim();
    if (!name) return;

    byId.set(id, {
      id,
      name,
      imageUrl: String(item.image_url || item.imageUrl || "").trim(),
      variants: kgVariants,
      fromPrice: kgVariants[0].price,
    });
  });

  const list = [...byId.values()];
  list.sort((a, b) => {
    const ia = BAKERY_CAKE_FLAVOR_ORDER.findIndex(
      (n) => n.toLowerCase() === a.name.toLowerCase()
    );
    const ib = BAKERY_CAKE_FLAVOR_ORDER.findIndex(
      (n) => n.toLowerCase() === b.name.toLowerCase()
    );
    const ra = ia < 0 ? 999 : ia;
    const rb = ib < 0 ? 999 : ib;
    if (ra !== rb) return ra - rb;
    return a.name.localeCompare(b.name);
  });
  return list;
}

/**
 * Build delivery_instructions text for owner Orders tab.
 * @param {Record<string, string>} fields
 */
export function formatCustomCakeInstructions(fields) {
  const lines = ["[Custom cake order]"];
  const map = [
    ["Flavor", fields.flavor],
    ["Size", fields.size],
    ["Price", fields.priceLabel],
    ["Message on cake", fields.cakeMessage],
    ["Occasion", fields.occasion],
    ["Theme / colours", fields.themeColors],
    ["Notes", fields.notes],
    ["Sample image", fields.sampleImageUrl],
  ];
  for (const [label, value] of map) {
    const v = String(value || "").trim();
    if (v) lines.push(`${label}: ${v}`);
  }
  return lines.join("\n");
}

/**
 * @param {string} notes
 * @returns {string}
 */
export function parseCustomCakeSampleUrl(notes) {
  const m = String(notes || "").match(/Sample image:\s*(\S+)/i);
  return (m?.[1] || "").trim();
}

/**
 * @param {string} notes
 * @returns {{ flavor: string, size: string }}
 */
export function parseCustomCakeFlavorSize(notes) {
  const text = String(notes || "");
  const flavor = (text.match(/^Flavor:\s*(.+)$/im)?.[1] || "").trim();
  const size = (text.match(/^Size:\s*(.+)$/im)?.[1] || "").trim();
  return { flavor, size };
}

/**
 * Notes text without the Sample image URL line (shown as thumbnail instead).
 * @param {string} notes
 * @returns {string}
 */
export function stripCustomCakeSampleLine(notes) {
  return String(notes || "")
    .replace(/^Sample image:\s*\S+\s*$/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Compress an image File for cake sample upload (max edge, JPEG).
 * @param {File} file
 * @param {{ maxEdge?: number, quality?: number }} [opts]
 * @returns {Promise<File>}
 */
export async function compressCakeSampleImage(file, opts = {}) {
  const maxEdge = opts.maxEdge ?? 1200;
  const quality = opts.quality ?? 0.82;
  const url = URL.createObjectURL(file);
  try {
    const image = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Could not read image."));
      img.src = url;
    });
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const w = Math.max(1, Math.round(image.width * scale));
    const h = Math.max(1, Math.round(image.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not process image.");
    ctx.drawImage(image, 0, 0, w, h);
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Could not compress image."))),
        "image/jpeg",
        quality
      );
    });
    const base = (file.name || "cake-sample").replace(/\.[^.]+$/, "") || "cake-sample";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg", lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(url);
  }
}

const CAKE_DRAFT_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

export function cakeOrderDraftCookieName(restaurantId) {
  return `gnc_cake_draft_${Number(restaurantId) || 0}`;
}

/**
 * @param {number|string} restaurantId
 * @returns {Record<string, unknown>|null}
 */
export function readCakeOrderDraftCookie(restaurantId) {
  if (typeof document === "undefined") return null;
  const name = cakeOrderDraftCookieName(restaurantId);
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(match[1]));
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Persist draft fields (no File blobs). Cookie ~4KB limit — keep payload small.
 * @param {number|string} restaurantId
 * @param {Record<string, unknown>} draft
 */
export function writeCakeOrderDraftCookie(restaurantId, draft) {
  if (typeof document === "undefined") return;
  const name = cakeOrderDraftCookieName(restaurantId);
  try {
    const payload = encodeURIComponent(JSON.stringify(draft));
    if (payload.length > 3500) {
      // Prefer dropping notes/message if oversized rather than failing silently
      const slim = { ...draft, notes: "", cakeMessage: String(draft.cakeMessage || "").slice(0, 80) };
      const slimPayload = encodeURIComponent(JSON.stringify(slim));
      document.cookie = `${name}=${slimPayload};path=/;max-age=${CAKE_DRAFT_MAX_AGE_SEC};samesite=lax`;
      return;
    }
    document.cookie = `${name}=${payload};path=/;max-age=${CAKE_DRAFT_MAX_AGE_SEC};samesite=lax`;
  } catch {
    /* ignore */
  }
}

export function clearCakeOrderDraftCookie(restaurantId) {
  if (typeof document === "undefined") return;
  const name = cakeOrderDraftCookieName(restaurantId);
  document.cookie = `${name}=;path=/;max-age=0;samesite=lax`;
}
