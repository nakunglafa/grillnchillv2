import websiteContentDefaults from "@/data/website-content.json";

export function normalizeWebsiteContent(content) {
  if (!content || typeof content !== "object") return {};
  const rawGalleryImages =
    content.gallery_images ??
    content.galleryImages ??
    content.image_gallery ??
    content.imageGallery ??
    [];
  return {
    storyTitle: content.story_title ?? content.storyTitle ?? "",
    storyText: content.story_text ?? content.storyText ?? "",
    promoVideoUrl: content.promo_video_url ?? content.promoVideoUrl ?? "",
    thaiSectionTitle: content.thai_section_title ?? content.thaiSectionTitle ?? "",
    thaiSectionIntro: content.thai_section_intro ?? content.thaiSectionIntro ?? "",
    sushiSectionTitle: content.sushi_section_title ?? content.sushiSectionTitle ?? "",
    sushiSectionIntro: content.sushi_section_intro ?? content.sushiSectionIntro ?? "",
    heroMainImage: content.hero_main_image_url ?? content.heroMainImage ?? "",
    heroSideImage: content.hero_side_image_url ?? content.heroSideImage ?? "",
    parallaxQualityBg: content.parallax_quality_bg_url ?? content.parallaxQualityBg ?? "",
    parallaxTestimonialsBg:
      content.parallax_testimonials_bg_url ?? content.parallaxTestimonialsBg ?? "",
    parallaxReserveBg: content.parallax_reserve_bg_url ?? content.parallaxReserveBg ?? "",
    thaiImageMain: content.thai_image_main_url ?? content.thaiImageMain ?? "",
    thaiImageSecondary: content.thai_image_secondary_url ?? content.thaiImageSecondary ?? "",
    thaiImageTertiary: content.thai_image_tertiary_url ?? content.thaiImageTertiary ?? "",
    sushiImageMain: content.sushi_image_main_url ?? content.sushiImageMain ?? "",
    sushiImageSecondary: content.sushi_image_secondary_url ?? content.sushiImageSecondary ?? "",
    sushiImageTertiary: content.sushi_image_tertiary_url ?? content.sushiImageTertiary ?? "",
    menuShowcaseEyebrow: content.menu_showcase_eyebrow ?? content.menuShowcaseEyebrow ?? "",
    menuShowcaseTitle: content.menu_showcase_title ?? content.menuShowcaseTitle ?? "",
    menuShowcaseIntro: content.menu_showcase_intro ?? content.menuShowcaseIntro ?? "",
    menuShowcaseThaiTitle:
      content.menu_showcase_thai_title ?? content.menuShowcaseThaiTitle ?? "",
    menuShowcaseThaiSubtext:
      content.menu_showcase_thai_subtext ?? content.menuShowcaseThaiSubtext ?? "",
    menuShowcaseThaiImage:
      content.menu_showcase_thai_image_url ?? content.menuShowcaseThaiImage ?? "",
    menuShowcaseSushiTitle:
      content.menu_showcase_sushi_title ?? content.menuShowcaseSushiTitle ?? "",
    menuShowcaseSushiSubtext:
      content.menu_showcase_sushi_subtext ?? content.menuShowcaseSushiSubtext ?? "",
    menuShowcaseSushiImage:
      content.menu_showcase_sushi_image_url ?? content.menuShowcaseSushiImage ?? "",
    menuShowcaseDessertTitle:
      content.menu_showcase_dessert_title ?? content.menuShowcaseDessertTitle ?? "",
    menuShowcaseDessertSubtext:
      content.menu_showcase_dessert_subtext ?? content.menuShowcaseDessertSubtext ?? "",
    menuShowcaseDessertImage:
      content.menu_showcase_dessert_image_url ?? content.menuShowcaseDessertImage ?? "",
    galleryImages: Array.isArray(rawGalleryImages)
      ? rawGalleryImages.map((src) => String(src ?? "").trim()).filter(Boolean)
      : [],
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
  const fileContent = { ...fallback, ...specific };
  const apiContent = normalizeWebsiteContent(apiRawContent);
  return { ...fileContent, ...apiContent };
}

export function pickShareImage(content, logoUrl) {
  const candidates = [
    content?.heroMainImage,
    content?.menuShowcaseSushiImage,
    content?.menuShowcaseThaiImage,
    content?.sushiImageMain,
    content?.thaiImageMain,
    logoUrl,
  ];
  return candidates.find((src) => typeof src === "string" && src.trim())?.trim() || "";
}

/** Default OG / schema image when API and logo are unavailable */
export function getDefaultShareImage(restaurantId) {
  const content = mergeWebsiteContent(restaurantId, null);
  return pickShareImage(content, null);
}

const CATEGORY_IMAGE_KEYS = {
  "thai-classics": ["thaiImageMain", "menuShowcaseThaiImage", "thaiImageSecondary"],
  "sushi-combinations": ["sushiImageMain", "menuShowcaseSushiImage", "sushiImageSecondary"],
  "rolls-uramaki": ["sushiImageSecondary", "sushiImageMain"],
  "hot-sushi": ["sushiImageTertiary", "sushiImageSecondary"],
  "nigiri-gunkan": ["menuShowcaseSushiImage", "sushiImageMain"],
};

export function getCategoryImage(categoryId, content) {
  const keys = CATEGORY_IMAGE_KEYS[categoryId] || ["heroMainImage"];
  for (const key of keys) {
    const src = content?.[key];
    if (typeof src === "string" && src.trim()) return src.trim();
  }
  return "";
}
