import websiteContentDefaults from "@/data/website-content.json";

/**
 * Normalize website_content for Grill N Chill public pages.
 * Kept fields: history/story + feature (hero) image.
 */
export function normalizeWebsiteContent(content) {
  if (!content || typeof content !== "object") return {};
  return {
    storyTitle: content.story_title ?? content.storyTitle ?? "",
    storyText: content.story_text ?? content.storyText ?? "",
    heroMainImage: content.hero_main_image_url ?? content.heroMainImage ?? "",
    // Legacy aliases still read for book/layout fallbacks
    parallaxReserveBg:
      content.parallax_reserve_bg_url ?? content.parallaxReserveBg ?? "",
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
  return { ...fileContent, ...apiContent };
}

export function pickShareImage(content, logoUrl) {
  const candidates = [content?.heroMainImage, logoUrl];
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
  return fallback || "";
}
