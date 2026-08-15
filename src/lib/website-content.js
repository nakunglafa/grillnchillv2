import websiteContentDefaults from "@/data/website-content.json";

/**
 * Public media base for Laravel storage paths (no trailing /api).
 */
export function getLaravelMediaOrigin() {
  const laravel = (process.env.NEXT_PUBLIC_LARAVEL_URL || "").replace(/\/$/, "");
  if (laravel) return laravel;
  const api = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
  if (api.endsWith("/api")) return api.slice(0, -4);
  return api || "https://restaurant.digitallisbon.pt";
}

/**
 * Turn relative /storage/... paths into absolute URLs browsers can load.
 * @param {unknown} pathOrUrl
 * @returns {string}
 */
export function resolveMediaUrl(pathOrUrl) {
  const raw = String(pathOrUrl || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  const origin = getLaravelMediaOrigin();
  if (!origin) return raw;
  return `${origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
}

/**
 * Pull website_content / content_json from /restaurants/{id}/website payloads.
 * @param {unknown} data
 * @returns {Record<string, unknown>|null}
 */
export function extractWebsiteContentFromPayload(data) {
  if (!data || typeof data !== "object") return null;
  const restaurant = data.restaurant ?? data.data ?? null;
  const candidates = [
    data.website_content,
    data.content_json,
    restaurant && typeof restaurant === "object" ? restaurant.website_content : null,
    restaurant && typeof restaurant === "object" ? restaurant.content_json : null,
  ];
  for (const c of candidates) {
    if (!c) continue;
    if (typeof c === "string") {
      try {
        const parsed = JSON.parse(c);
        if (parsed && typeof parsed === "object") return parsed;
      } catch {
        continue;
      }
    }
    if (typeof c === "object") {
      // Some APIs nest again: { content_json: { hero_main_image_url } }
      if (c.content_json && typeof c.content_json === "object") {
        return { ...c, ...c.content_json };
      }
      if (typeof c.content_json === "string") {
        try {
          const nested = JSON.parse(c.content_json);
          if (nested && typeof nested === "object") return { ...c, ...nested };
        } catch {
          /* ignore */
        }
      }
      return c;
    }
  }
  return null;
}

/**
 * Normalize website_content for Grill N Chill public pages.
 * Kept fields: history/story + feature (hero) + booking page image.
 */
export function normalizeWebsiteContent(content) {
  if (!content || typeof content !== "object") return {};
  return {
    storyTitle: content.story_title ?? content.storyTitle ?? "",
    storyText: content.story_text ?? content.storyText ?? "",
    heroMainImage: resolveMediaUrl(
      content.hero_main_image_url ?? content.heroMainImage ?? ""
    ),
    bookPageImage: resolveMediaUrl(
      content.book_page_image_url ?? content.bookPageImage ?? ""
    ),
    // Legacy aliases still read for book/layout fallbacks
    parallaxReserveBg: resolveMediaUrl(
      content.parallax_reserve_bg_url ?? content.parallaxReserveBg ?? ""
    ),
    googlePlaceId: content.google_place_id ?? content.googlePlaceId ?? "",
    googlePlaceSyncedAt: content.google_place_synced_at ?? content.googlePlaceSyncedAt ?? "",
    themeAccent: content.theme_accent ?? content.themeAccent ?? "",
    themeBackground: content.theme_background ?? content.themeBackground ?? "",
    themeForeground: content.theme_foreground ?? content.themeForeground ?? "",
    themeFontPair: content.theme_font_pair ?? content.themeFontPair ?? "",
  };
}

export function mergeWebsiteContent(restaurantId, apiRawContent) {
  const contentId = String(restaurantId ?? "default");
  const fallback =
    websiteContentDefaults?.default && typeof websiteContentDefaults.default === "object"
      ? websiteContentDefaults.default
      : {};
  const specific =
    websiteContentDefaults && typeof websiteContentDefaults === "object"
      ? websiteContentDefaults[contentId] || {}
      : {};
  const fileContent = normalizeWebsiteContent({ ...fallback, ...specific });
  const apiContent = normalizeWebsiteContent(apiRawContent);
  // Prefer non-empty API image fields over empty file defaults
  return {
    ...fileContent,
    ...apiContent,
    heroMainImage: apiContent.heroMainImage || fileContent.heroMainImage || "",
    bookPageImage: apiContent.bookPageImage || fileContent.bookPageImage || "",
    parallaxReserveBg: apiContent.parallaxReserveBg || fileContent.parallaxReserveBg || "",
  };
}

export function pickShareImage(content, logoUrl) {
  const candidates = [
    content?.heroMainImage,
    content?.bookPageImage,
    resolveMediaUrl(logoUrl),
  ];
  return candidates.find((src) => typeof src === "string" && src.trim())?.trim() || "";
}

/** Default OG / schema image when API and logo are unavailable */
export function getDefaultShareImage(restaurantId) {
  const content = mergeWebsiteContent(restaurantId, null);
  return pickShareImage(content, null);
}

/** Feature / hero image for a location page */
export function getFeatureImage(content, fallback = "") {
  const src = content?.heroMainImage;
  if (typeof src === "string" && src.trim()) return src.trim();
  return resolveMediaUrl(fallback) || "";
}

/** Booking page left-column image */
export function getBookPageImage(content, fallback = "") {
  const src =
    content?.bookPageImage ||
    content?.parallaxReserveBg ||
    content?.heroMainImage ||
    "";
  if (typeof src === "string" && src.trim()) return src.trim();
  return resolveMediaUrl(fallback) || "";
}
