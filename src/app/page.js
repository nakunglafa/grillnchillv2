"use client";

import { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { getRestaurant } from "@/lib/api";
import { useCart } from "@/context/CartContext";
import websiteContentDefaults from "@/data/website-content.json";

/** Hero collage (defaults to Unsplash — override via .env for your own photos) */
const HERO_COLLAGE_MAIN =
  process.env.NEXT_PUBLIC_HERO_COLLAGE_MAIN ||
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80";
const HERO_COLLAGE_SIDE =
  process.env.NEXT_PUBLIC_HERO_COLLAGE_SIDE ||
  "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=800&q=80";

/** Full-width parallax band (optional override — rustic plate / steak overhead works well) */
const PARALLAX_QUALITY_BG =
  process.env.NEXT_PUBLIC_PARALLAX_BG ||
  "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1920&q=80";

/** Parallax band behind testimonial carousel (dining / moody — override in .env) */
const PARALLAX_TESTIMONIALS_BG =
  process.env.NEXT_PUBLIC_PARALLAX_TESTIMONIALS_BG ||
  "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1920&q=80";

/** Parallax background for reserve CTA (restaurant interior — override in .env) */
const PARALLAX_RESERVE_BG =
  process.env.NEXT_PUBLIC_PARALLAX_RESERVE_BG ||
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1920&q=80";

/** Footer bar copy when API fields are missing */
const RESERVE_INFO_FALLBACK = {
  address: "Sovy Restaurant, Jl. Raya / Canggu, Badung, Bali.",
  phones: "(+62) 81 224 557 900 / (+62) 82 222 577 912",
  emails: "Reservation@sovy.com / Books@sovy.com",
  hours: "Open 04:00 pm WITA / Closed 01:00 am WITA",
};

/** Animated stats row (Services section after parallax) */
const SERVICES_STATS_DURATION_MS = 1600;

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || "9";
const PROMO_VIDEO_URL = process.env.NEXT_PUBLIC_PROMO_VIDEO_URL || "";

const MENU_SHOWCASE_PRIORITIES = [
  { id: "thai", label: "Thai", keyword: "thai", fallbackSubtext: "Curries / Noodles / Stir-fry" },
  { id: "sushi", label: "Sushi", keyword: "sushi", fallbackSubtext: "Maki / Nigiri / Sashimi" },
  { id: "dessert", label: "Dessert", keyword: "dessert", fallbackSubtext: "Cake / Ice cream / Mochi" },
];

function formatPrice(value) {
  if (value == null || value === "") return "";
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  if (Number.isNaN(n)) return "";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}

// Helper function to capitalize days and format times to 12-hour AM/PM format
function formatTime(timeStr) {
  if (!timeStr) return "";
  const [hoursStr, minutesStr] = timeStr.split(":");
  let hours = parseInt(hoursStr, 10);
  const ampm = hours >= 12 ? "PM" : "AM";
  
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  
  return `${hours}:${minutesStr} ${ampm}`;
}

function formatOpeningHoursSentence(openingHours) {
  if (!openingHours || openingHours.length === 0) return "Opening hours not available.";

  const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  
  const slotsByDay = {};
  daysOfWeek.forEach((day) => {
    slotsByDay[day] = [];
  });

  openingHours.forEach((slot) => {
    if (slotsByDay[slot.day_of_week]) {
      slotsByDay[slot.day_of_week].push(slot);
    }
  });

  const scheduleMap = {};
  daysOfWeek.forEach((day) => {
    const daySlots = slotsByDay[day];
    let timeStr = "Closed";
    if (daySlots.length > 0) {
      daySlots.sort((a, b) => a.open_time.localeCompare(b.open_time));
      // Join with ' and ' if multiple slots in a day
      timeStr = daySlots.map((s) => `${formatTime(s.open_time)} - ${formatTime(s.close_time)}`).join(" and ");
    }
    if (!scheduleMap[timeStr]) scheduleMap[timeStr] = [];
    scheduleMap[timeStr].push(day);
  });

  const uniqueSchedules = Object.keys(scheduleMap);
  const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  if (uniqueSchedules.length === 1) {
    if (uniqueSchedules[0] === "Closed") return "Closed every day.";
    return `Open every day from ${uniqueSchedules[0]}.`;
  }

  if (uniqueSchedules.length === 2 && uniqueSchedules.includes("Closed")) {
    const openSchedule = uniqueSchedules.find((s) => s !== "Closed");
    const closedDays = scheduleMap["Closed"];
    
    if (closedDays.length === 1) {
      return `Open every day from ${openSchedule} except ${capitalize(closedDays[0])} (Closed).`;
    } else if (closedDays.length === 2) {
      return `Open every day from ${openSchedule} except ${capitalize(closedDays[0])} and ${capitalize(closedDays[1])} (Closed).`;
    }
  }

  // Fallback for more complex schedules
  return Object.entries(scheduleMap)
    .filter(([timeStr]) => timeStr !== "Closed")
    .map(([timeStr, days]) => {
      const formattedDays = days.map(capitalize).join(", ");
      return `${formattedDays}: ${timeStr}`;
    })
    .join(" | ");
}

const AUTO_SLIDE_MS = 5000;

/** Shown when API has no curated testimonials yet */
const DEFAULT_TESTIMONIAL_FALLBACK = {
  quote:
    "The discovery of a new dish does more for the happiness of mankind than the discovery of a star.",
  reviewer_name: "Anthelme Brillat-Savarin",
};

const PLACEHOLDER_TESTIMONIALS = [
  {
    reviewer_name: "Maria S.",
    quote:
      "Outstanding flavors and friendly service. We keep coming back for the sushi and the welcoming atmosphere.",
  },
  {
    reviewer_name: "James R.",
    quote:
      "Perfect for a relaxed dinner. The food arrived quickly and everything tasted fresh and well prepared.",
  },
  {
    reviewer_name: "Ana P.",
    quote: "Great spot in Almancil — easy to book, lovely staff, and generous portions.",
  },
];

/** “Our story” feature row — two columns like reference layout */
const OUR_STORY_FEATURES = [
  "Fine dining",
  "Food delivery",
  "Food catering",
  "Wedding ceremony",
];

/** Temporary fallback for the new dark specials block until API specials are ready */
const DUMMY_SPECIALS_MENU = [
  {
    id: "dummy-1",
    name: "Citrus Cured Salmon With Honey",
    price: 20,
    description: "Salmon / Citrus / Honey / Spice",
  },
  {
    id: "dummy-2",
    name: "Pork Tenderloin in Yogurt",
    price: 25,
    description: "Pork / Tenderloin / Yogurt",
  },
  {
    id: "dummy-3",
    name: "Grilled Pork With Lemons",
    price: 27,
    description: "Pork / Lemon / Onions",
  },
  {
    id: "dummy-4",
    name: "Roasted Prawns with Coriander",
    price: 18,
    description: "Prawn / Coriander / Spices",
  },
  {
    id: "dummy-5",
    name: "Prawn Sausage Cassoulet",
    price: 19,
    description: "Prawn / Sausage / Tomato",
  },
];

function collectCategoryItems(category) {
  const out = [];
  const walk = (node) => {
    if (!node) return;
    const nodeItems = Array.isArray(node.items) ? node.items : [];
    nodeItems.forEach((it) => {
      if (it && it.is_available !== false) out.push(it);
    });
    const children = Array.isArray(node.children) ? node.children : [];
    children.forEach(walk);
  };
  walk(category);
  const seen = new Set();
  return out.filter((item) => {
    const key = item?.id ?? `${item?.name}-${item?.price}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function getItemDisplayPrice(item) {
  const variants = Array.isArray(item?.variants) ? item.variants : [];
  const variantPrices = variants
    .filter((v) => v?.is_available !== false)
    .map((v) => parseFloat(v?.price))
    .filter((n) => Number.isFinite(n));
  if (variantPrices.length > 0) return Math.min(...variantPrices);
  const base = parseFloat(item?.price);
  return Number.isFinite(base) ? base : null;
}

function normalizeWebsiteContent(content) {
  if (!content || typeof content !== "object") return {};
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
  };
}

function normalizeSearchText(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "");
}

function toFiniteNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

export default function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const specialsRowRef = useRef(null);
  const specialMenusRowRefs = useRef([]);
  const { addItem } = useCart();
  const [activeSpecialId, setActiveSpecialId] = useState(null);
  const [activeSpecialMenuItemId, setActiveSpecialMenuItemId] = useState(null);
  const servicesStatsRef = useRef(null);
  const servicesStatsAnimRafRef = useRef(null);
  const [statFoodVariant, setStatFoodVariant] = useState(0);
  const [statPersonCapacity, setStatPersonCapacity] = useState(0);
  const [testimonialCarouselIndex, setTestimonialCarouselIndex] = useState(0);

  useEffect(() => {
    getRestaurant(RESTAURANT_ID)
      .then(setData)
      .catch((err) => setError(err.message || "Failed to load restaurant info"))
      .finally(() => setLoading(false));
  }, []);

  const restaurant = data?.restaurant;
  const restaurantContentId = String(restaurant?.id ?? RESTAURANT_ID ?? "default");
  const fileWebsiteContent = useMemo(() => {
    const fallback = (websiteContentDefaults?.default && typeof websiteContentDefaults.default === "object")
      ? websiteContentDefaults.default
      : {};
    const specific =
      websiteContentDefaults && typeof websiteContentDefaults === "object"
        ? websiteContentDefaults[restaurantContentId] || {}
        : {};
    return { ...fallback, ...specific };
  }, [restaurantContentId]);

  const apiWebsiteContent = useMemo(() => {
    const raw =
      data?.website_content ??
      data?.data?.website_content ??
      restaurant?.website_content ??
      restaurant?.content_json ??
      null;
    return normalizeWebsiteContent(raw);
  }, [data, restaurant]);

  const mergedWebsiteContent = useMemo(
    () => ({ ...fileWebsiteContent, ...apiWebsiteContent }),
    [fileWebsiteContent, apiWebsiteContent]
  );
  // According to the new JSON structure, slots are inside data.opening_hours.opening_slots
  const openingHours = data?.opening_hours?.opening_slots || [];
  const heroMainImage = mergedWebsiteContent?.heroMainImage || HERO_COLLAGE_MAIN;
  const heroSideImage = mergedWebsiteContent?.heroSideImage || HERO_COLLAGE_SIDE;
  const parallaxQualityBg = mergedWebsiteContent?.parallaxQualityBg || PARALLAX_QUALITY_BG;
  const parallaxTestimonialsBg =
    mergedWebsiteContent?.parallaxTestimonialsBg || PARALLAX_TESTIMONIALS_BG;
  const parallaxReserveBg = mergedWebsiteContent?.parallaxReserveBg || PARALLAX_RESERVE_BG;
  const storyTitle = mergedWebsiteContent?.storyTitle || "The story";
  const storyText =
    mergedWebsiteContent?.storyText ||
    restaurant?.description ||
    "We bring together quality ingredients, skilled cooking, and a relaxed atmosphere so every visit feels special. From weekday lunches to weekend dinners, our team is here to serve you.";
  const promoVideoUrl = String(mergedWebsiteContent?.promoVideoUrl ?? PROMO_VIDEO_URL ?? "").trim();

  /** Curated testimonials from API: { id, reviewer_name, quote, sort_order } */
  const testimonialsSorted = useMemo(() => {
    const raw = restaurant?.testimonials;
    if (!Array.isArray(raw)) return [];
    return [...raw].sort(
      (a, b) => (Number(a.sort_order) || 0) - (Number(b.sort_order) || 0)
    );
  }, [restaurant?.testimonials]);

  const featuredTestimonial = testimonialsSorted[0] ?? null;

  /** Slides for parallax testimonial carousel — all curated quotes from API, else demo set */
  const testimonialParallaxSlides = useMemo(() => {
    const fromApi = testimonialsSorted
      .map((t) => ({
        id: String(t.id ?? `t-${t.reviewer_name}-${t.sort_order ?? 0}`),
        quote: String(t.quote ?? "").trim(),
        name: String(t.reviewer_name ?? "").trim(),
      }))
      .filter((t) => t.quote && t.name);
    if (fromApi.length > 0) return fromApi;
    return [
      {
        id: "demo-lorem",
        name: "Ramon Tran",
        quote:
          "Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes.",
      },
      ...PLACEHOLDER_TESTIMONIALS.map((p, i) => ({
        id: `demo-${i}`,
        name: p.reviewer_name,
        quote: p.quote,
      })),
    ];
  }, [testimonialsSorted]);

  const specialItems = useMemo(() => {
    const lists =
      data?.special_menus ??
      restaurant?.special_menus ??
      [];
    if (!Array.isArray(lists)) return [];
    const seen = new Set();
    const items = [];
    lists.forEach((list) => {
      const arr = Array.isArray(list.items) ? list.items : [];
      arr.forEach((item) => {
        const id = item.id ?? item.menu_item_id;
        if (!id || seen.has(id)) return;
        seen.add(id);
        if (item.is_available === false) return;
        items.push(item);
      });
    });
    return items.slice(0, 12);
  }, [data, restaurant]);

  const specialsMenuList = useMemo(() => {
    const fromApi = specialItems.slice(0, 5);
    return fromApi.length > 0 ? fromApi : DUMMY_SPECIALS_MENU;
  }, [specialItems]);

  const totalFoodItems = useMemo(() => {
    const menus = Array.isArray(restaurant?.menus) ? restaurant.menus : [];
    const uniqueItemIds = new Set();
    const uniqueItemNames = new Set();
    let count = 0;

    const walkCategory = (category) => {
      if (!category) return;
      const items = Array.isArray(category?.items) ? category.items : [];
      items.forEach((item) => {
        if (!item) return;
        const byId = toFiniteNumber(item?.id ?? item?.menu_item_id);
        if (byId != null) {
          if (uniqueItemIds.has(byId)) return;
          uniqueItemIds.add(byId);
          count += 1;
          return;
        }
        const byName = String(item?.name ?? "").trim().toLowerCase();
        if (!byName || uniqueItemNames.has(byName)) return;
        uniqueItemNames.add(byName);
        count += 1;
      });
      const children = Array.isArray(category?.children) ? category.children : [];
      children.forEach(walkCategory);
    };

    menus.forEach((menu) => {
      const categories = Array.isArray(menu?.categories) ? menu.categories : [];
      categories.forEach(walkCategory);
    });

    return count;
  }, [restaurant?.menus]);

  const totalTables = useMemo(() => {
    const explicitCountCandidates = [
      restaurant?.total_tables,
      restaurant?.tables_count,
      data?.total_tables,
      data?.tables_count,
      data?.opening_hours?.total_tables,
      data?.opening_hours?.tables_count,
      data?.opening_hours?.max_party_size,
    ];
    for (const value of explicitCountCandidates) {
      const parsed = toFiniteNumber(value);
      if (parsed != null) return parsed;
    }

    const tableArrays = [
      Array.isArray(restaurant?.tables) ? restaurant.tables : null,
      Array.isArray(data?.tables) ? data.tables : null,
    ];
    for (const arr of tableArrays) {
      if (arr) return arr.length;
    }

    return 0;
  }, [restaurant, data]);

  const specialsMenuShowcaseImages = useMemo(() => {
    const fromItems = specialItems
      .map((item) => item?.image_url)
      .filter((src) => typeof src === "string" && src.trim().length > 0);
    return [...fromItems, heroMainImage, heroSideImage, heroMainImage].slice(0, 3);
  }, [specialItems, heroMainImage, heroSideImage]);

  const featuredMenuCategorySections = useMemo(() => {
    const menus = Array.isArray(restaurant?.menus) ? restaurant.menus : [];
    const topCategories = menus.flatMap((menu) => (Array.isArray(menu?.categories) ? menu.categories : []));

    const findTopCategory = (keyword) =>
      topCategories.find((cat) =>
        String(cat?.name ?? "")
          .toLowerCase()
          .includes(keyword)
      );

    const thaiCategory = findTopCategory("thai");
    const sushiCategory = findTopCategory("sushi");

    const buildSection = (category, config) => {
      if (!category) return null;
      const items = collectCategoryItems(category).slice(0, 6);
      if (items.length === 0) return null;
      const imageCandidates = items
        .map((item) => item?.image_url)
        .filter((src) => typeof src === "string" && src.trim().length > 0);
      return {
        id: config.id,
        eyebrow: config.eyebrow,
        title: config.titleOverride || config.title,
        description: config.descriptionOverride || category?.description || null,
        reverse: config.reverse,
        items,
        images: [
          config.imageMain || imageCandidates[0] || heroMainImage,
          config.imageSecondary || imageCandidates[1] || heroSideImage,
          config.imageTertiary || imageCandidates[2] || heroMainImage,
        ],
      };
    };

    return [
      buildSection(thaiCategory, {
        id: "thai-menu-highlight",
        eyebrow: "Thai categories",
        title: "Thai Menu",
        titleOverride: mergedWebsiteContent?.thaiSectionTitle,
        descriptionOverride: mergedWebsiteContent?.thaiSectionIntro,
        imageMain: mergedWebsiteContent?.thaiImageMain,
        imageSecondary: mergedWebsiteContent?.thaiImageSecondary,
        imageTertiary: mergedWebsiteContent?.thaiImageTertiary,
        reverse: false,
      }),
      buildSection(sushiCategory, {
        id: "sushi-menu-highlight",
        eyebrow: "Sushi foods",
        title: "Sushi Menu",
        titleOverride: mergedWebsiteContent?.sushiSectionTitle,
        descriptionOverride: mergedWebsiteContent?.sushiSectionIntro,
        imageMain: mergedWebsiteContent?.sushiImageMain,
        imageSecondary: mergedWebsiteContent?.sushiImageSecondary,
        imageTertiary: mergedWebsiteContent?.sushiImageTertiary,
        reverse: true,
      }),
    ].filter(Boolean);
  }, [restaurant?.menus, mergedWebsiteContent, heroMainImage, heroSideImage]);

  const menuShowcaseCards = useMemo(() => {
    const menus = Array.isArray(restaurant?.menus) ? restaurant.menus : [];
    const topCategories = menus.flatMap((menu) =>
      (Array.isArray(menu?.categories) ? menu.categories : []).filter((cat) => !cat?.parent_id)
    );
    const usedCategoryKeys = new Set();

    const getCategoryKey = (category) =>
      String(category?.id ?? `${String(category?.name ?? "").toLowerCase()}`);

    const pickCategoryImage = (category) => {
      if (typeof category?.image_url === "string" && category.image_url.trim()) {
        return category.image_url;
      }
      const itemImage = collectCategoryItems(category)
        .map((item) => item?.image_url)
        .find((src) => typeof src === "string" && src.trim());
      return itemImage || null;
    };

    const buildCard = (category, fallbackConfig) => {
      if (!category && !fallbackConfig) return null;
      const title =
        String(category?.name ?? "").trim() ||
        String(fallbackConfig?.label ?? "").trim() ||
        "Menu";
      const children = Array.isArray(category?.children) ? category.children : [];
      const childNames = children
        .map((child) => String(child?.name ?? "").trim())
        .filter(Boolean)
        .slice(0, 3);
      const itemNames = collectCategoryItems(category)
        .map((item) => String(item?.name ?? "").trim())
        .filter(Boolean)
        .slice(0, 3);
      const subtext =
        childNames.length > 0
          ? childNames.join(" / ")
          : itemNames.length > 0
            ? itemNames.join(" / ")
            : fallbackConfig?.fallbackSubtext || "Popular selections";

      return {
        id: fallbackConfig?.id || getCategoryKey(category),
        title,
        subtext,
        image: pickCategoryImage(category),
      };
    };

    const prioritizedCards = MENU_SHOWCASE_PRIORITIES.map((priority) => {
      const category = topCategories.find((cat) => {
        const key = getCategoryKey(cat);
        if (usedCategoryKeys.has(key)) return false;
        return normalizeSearchText(cat?.name).includes(priority.keyword);
      });
      if (!category) return buildCard(null, priority);
      usedCategoryKeys.add(getCategoryKey(category));
      return buildCard(category, priority);
    }).filter(Boolean);

    const remainingCards = topCategories
      .filter((cat) => !usedCategoryKeys.has(getCategoryKey(cat)))
      .slice(0, Math.max(0, 3 - prioritizedCards.length))
      .map((cat, index) => buildCard(cat, { id: `menu-${index + 1}` }))
      .filter(Boolean);

    const fallbackImages = [heroMainImage, heroSideImage, heroMainImage];
    const overrideById = {
      thai: {
        title: mergedWebsiteContent?.menuShowcaseThaiTitle,
        subtext: mergedWebsiteContent?.menuShowcaseThaiSubtext,
        image: mergedWebsiteContent?.menuShowcaseThaiImage,
      },
      sushi: {
        title: mergedWebsiteContent?.menuShowcaseSushiTitle,
        subtext: mergedWebsiteContent?.menuShowcaseSushiSubtext,
        image: mergedWebsiteContent?.menuShowcaseSushiImage,
      },
      dessert: {
        title: mergedWebsiteContent?.menuShowcaseDessertTitle,
        subtext: mergedWebsiteContent?.menuShowcaseDessertSubtext,
        image: mergedWebsiteContent?.menuShowcaseDessertImage,
      },
    };

    return [...prioritizedCards, ...remainingCards].slice(0, 3).map((card, index) => ({
      ...card,
      title: String(overrideById[card.id]?.title ?? "").trim() || card.title,
      subtext: String(overrideById[card.id]?.subtext ?? "").trim() || card.subtext,
      image:
        String(overrideById[card.id]?.image ?? "").trim() ||
        card.image ||
        fallbackImages[index] ||
        heroMainImage,
    }));
  }, [restaurant?.menus, heroMainImage, heroSideImage, mergedWebsiteContent]);

  const specialMenuListsForUI = useMemo(() => {
    const lists =
      restaurant?.special_menu_lists ??
      data?.special_menu_lists ??
      [];
    if (!Array.isArray(lists)) return [];

    return lists
      .filter((l) => l && l.is_active !== false)
      .map((l) => {
        const items = Array.isArray(l.items) ? l.items : [];
        const filtered = items.filter((it) => it?.is_available !== false);
        return {
          id: l.id ?? l.slug ?? l.name,
          name: l.name ?? "Special",
          items: filtered,
        };
      })
      .filter((l) => l.items.length > 0);
  }, [data, restaurant]);

  // Auto-slide horizontal "Chef's specials" row
  useEffect(() => {
    if (!specialsRowRef.current || specialItems.length === 0) return;
    const row = specialsRowRef.current;
    const card = row.querySelector("article");
    if (!card) return;

    const cardWidth = card.getBoundingClientRect().width + 16; // include gap

    const interval = setInterval(() => {
      if (!row) return;
      const maxScroll = row.scrollWidth - row.clientWidth;
      const next = row.scrollLeft + cardWidth;
      row.scrollTo({
        left: next >= maxScroll ? 0 : next,
        behavior: "smooth",
      });
    }, AUTO_SLIDE_MS);

    return () => clearInterval(interval);
  }, [specialItems.length]);

  // Auto-slide all special menu rows
  useEffect(() => {
    const rows = (specialMenusRowRefs.current || []).filter(Boolean);
    if (rows.length === 0) return;

    const intervals = rows.map((row) => {
      const card = row.querySelector("article");
      if (!card) return null;
      const cardWidth = card.getBoundingClientRect().width + 16;

      return setInterval(() => {
        const maxScroll = row.scrollWidth - row.clientWidth;
        const next = row.scrollLeft + cardWidth;
        row.scrollTo({
          left: next >= maxScroll ? 0 : next,
          behavior: "smooth",
        });
      }, AUTO_SLIDE_MS);
    });

    return () => {
      intervals.forEach((id) => id && clearInterval(id));
    };
  }, [specialMenuListsForUI.length]);

  /** Count-up stats when the services band is in view; reset when it leaves (re-animates on each visit) */
  useEffect(() => {
    if (loading) return;
    const el = servicesStatsRef.current;
    if (!el) return;
    const foodItems = Math.max(0, totalFoodItems);
    const tables = Math.max(0, totalTables);

    const runCountUp = () => {
      if (servicesStatsAnimRafRef.current) {
        cancelAnimationFrame(servicesStatsAnimRafRef.current);
        servicesStatsAnimRafRef.current = null;
      }
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min((now - start) / SERVICES_STATS_DURATION_MS, 1);
        const eased = 1 - (1 - t) ** 3;
        setStatFoodVariant(Math.round(foodItems * eased));
        setStatPersonCapacity(Math.round(tables * eased));
        if (t < 1) {
          servicesStatsAnimRafRef.current = requestAnimationFrame(tick);
        } else {
          setStatFoodVariant(foodItems);
          setStatPersonCapacity(tables);
          servicesStatsAnimRafRef.current = null;
        }
      };
      servicesStatsAnimRafRef.current = requestAnimationFrame(tick);
    };

    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          if (servicesStatsAnimRafRef.current) {
            cancelAnimationFrame(servicesStatsAnimRafRef.current);
            servicesStatsAnimRafRef.current = null;
          }
          setStatFoodVariant(0);
          setStatPersonCapacity(0);
          return;
        }
        runCountUp();
      },
      { threshold: 0.22, rootMargin: "0px 0px -8% 0px" }
    );
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (servicesStatsAnimRafRef.current) {
        cancelAnimationFrame(servicesStatsAnimRafRef.current);
      }
    };
  }, [loading, totalFoodItems, totalTables]);

  useEffect(() => {
    setTestimonialCarouselIndex(0);
  }, [testimonialParallaxSlides.length, restaurant?.id]);

  useEffect(() => {
    const n = testimonialParallaxSlides.length;
    if (n <= 1) return;
    const id = setInterval(() => {
      setTestimonialCarouselIndex((i) => (i + 1) % n);
    }, 7000);
    return () => clearInterval(id);
  }, [testimonialParallaxSlides.length]);

  // Enable mouse-drag horizontal scrolling for specials rows (desktop)
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragScrollLeftRef = useRef(0);

  const handleDragStart = (e) => {
    const el = e.currentTarget;
    isDraggingRef.current = true;
    dragStartXRef.current = e.pageX - el.offsetLeft;
    dragScrollLeftRef.current = el.scrollLeft;
  };

  const handleDragMove = (e) => {
    if (!isDraggingRef.current) return;
    const el = e.currentTarget;
    e.preventDefault();
    const x = e.pageX - el.offsetLeft;
    const walk = x - dragStartXRef.current;
    el.scrollLeft = dragScrollLeftRef.current - walk;
  };

  const handleDragEnd = () => {
    isDraggingRef.current = false;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-wood-100">
        <Header variant="overlay" />
        <section className="hero-sovy-wood relative min-h-dvh w-full overflow-hidden">
          <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col justify-center px-4 pb-10 pt-[5.5rem] sm:px-6 sm:pb-14 sm:pt-24 lg:px-10 lg:pb-16 lg:pt-28">
            <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8 xl:gap-12">
              <div className="animate-pulse lg:col-span-5 xl:col-span-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-accent">
                  Loading website...
                </p>
                <div className="mt-6 h-5 w-40 rounded bg-white/15" />
                <div className="mt-3 h-12 w-full max-w-md rounded bg-white/20" />
                <div className="mt-3 h-12 w-5/6 max-w-sm rounded bg-white/20" />
                <div className="mt-3 h-12 w-2/3 max-w-xs rounded bg-white/20" />
                <div className="mt-10 h-11 w-36 rounded bg-accent/50" />
              </div>
              <div className="lg:col-span-7 xl:col-span-7">
                <div className="relative mx-auto aspect-[4/3] w-full min-h-[min(52vh,520px)] overflow-hidden rounded-md bg-white/10 ring-1 ring-white/15 sm:aspect-[5/4] sm:min-h-[min(56vh,600px)] lg:aspect-auto lg:min-h-[min(62vh,720px)] lg:h-[min(62vh,720px)]">
                  <div className="h-full w-full animate-pulse bg-gradient-to-br from-white/10 via-white/20 to-white/10" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  const PlayCircle = (
    <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-accent bg-accent shadow-lg">
      <svg className="ml-1 h-6 w-6 text-wood-950" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M8 5v14l11-7z" />
      </svg>
    </span>
  );

  return (
    <div className="min-h-screen bg-wood-100">
      <Header variant="overlay" />
      <section className="hero-sovy-wood relative min-h-dvh w-full overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_70%_20%,rgba(201,162,39,0.07),transparent_55%)]"
          aria-hidden
        />
        <div className="pointer-events-none absolute -left-20 top-0 h-40 w-40 rounded-full bg-emerald-900/20 blur-3xl" aria-hidden />
        <div className="pointer-events-none absolute -right-10 top-8 h-32 w-32 rounded-full bg-amber-900/15 blur-2xl" aria-hidden />

        {/* Full-viewport fold: vertically centered content, no short max-height cap */}
        <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-[1600px] flex-col justify-center px-4 pb-10 pt-[5.5rem] sm:px-6 sm:pb-14 sm:pt-24 lg:px-10 lg:pb-16 lg:pt-28">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-8 xl:gap-12">
            <div className="lg:col-span-5 xl:col-span-5">
              <h1 className="font-sans text-[clamp(2.5rem,5.5vw,5rem)] font-bold leading-[1.02] tracking-tight text-white">
                <span className="block">We Only Serve</span>
                <span className="block">
                  A <span className="text-accent">Delicious</span>
                </span>
                <span className="block">Dishes</span>
              </h1>
              <div className="mt-8 flex flex-col gap-8 sm:mt-10 sm:flex-row sm:items-center sm:gap-10 lg:gap-12">
                <Link
                  href="/book"
                  className="inline-flex w-max items-center justify-center rounded-sm bg-accent px-10 py-3.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-white shadow-lg transition-colors hover:bg-accent-hover sm:px-14 sm:py-4"
                >
                  Reserve now
                </Link>
                {promoVideoUrl ? (
                  <a
                    href={promoVideoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group inline-flex items-center gap-4 text-white"
                  >
                    {PlayCircle}
                    <span className="text-[17px] font-medium tracking-wide">Watch Video</span>
                  </a>
                ) : null}
              </div>
            </div>

            <div className="relative mx-auto w-full lg:col-span-7 xl:col-span-7">
              <div className="relative aspect-[4/3] w-full min-h-[min(52vh,520px)] sm:aspect-[5/4] sm:min-h-[min(56vh,600px)] lg:aspect-auto lg:min-h-[min(62vh,720px)] lg:h-[min(62vh,720px)]">
                <img
                  src={heroMainImage}
                  alt="Restaurant interior"
                  className="absolute inset-x-0 bottom-0 left-0 h-[88%] w-[94%] rounded-md object-cover shadow-2xl ring-1 ring-white/15"
                  sizes="(max-width: 1024px) 100vw, 58vw"
                />
                <img
                  src={heroSideImage}
                  alt="Chef preparing food"
                  className="absolute right-0 top-0 z-[1] h-[42%] w-[min(46%,380px)] rounded-md object-cover shadow-2xl ring-1 ring-white/15 sm:h-[38%] sm:w-[min(42%,360px)] lg:h-[40%] lg:w-[min(38%,400px)]"
                  sizes="(max-width: 1024px) 45vw, 400px"
                />
                <p className="font-display absolute bottom-[2%] left-[2%] right-[8%] z-[2] max-w-xl text-left text-[12px] italic leading-relaxed text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,0.9)] sm:bottom-[5%] sm:text-[14px] lg:bottom-[6%] lg:max-w-lg lg:text-[15px]">
                  The only thing we&apos;re serious about is food. We will wait for your seat in our
                  restaurant and satisfy you with quality food.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured testimonial — dark luxury band (first curated quote from API, right under hero) */}
      <section
        className="relative border-y border-white/[0.06] bg-[#0a0908] py-16 text-center md:py-20 lg:py-24"
        aria-label="Featured testimonial"
      >
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_0%,rgba(197,157,95,0.06),transparent_55%)]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6">
          {loading ? (
            <p className="text-[15px] text-white/35">Loading…</p>
          ) : (
            (() => {
              const t = featuredTestimonial || DEFAULT_TESTIMONIAL_FALLBACK;
              const quote = String(t.quote ?? "").trim();
              const name = String(t.reviewer_name ?? "").trim();
              return (
                <>
                  <div className="mb-8 flex justify-center" aria-hidden>
                    <span
                      className="font-display text-[4.25rem] leading-none text-transparent sm:text-[5rem]"
                      style={{ WebkitTextStroke: "1px rgba(197, 157, 95, 0.92)" }}
                    >
                      “
                    </span>
                  </div>
                  <blockquote className="mx-auto">
                    <p className="font-display text-[clamp(1.125rem,2.8vw,1.5rem)] italic leading-[1.65] text-white/95">
                      &ldquo;{quote}&rdquo;
                    </p>
                    {name ? (
                      <footer className="mt-8 font-sans text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
                        {name}
                      </footer>
                    ) : null}
                  </blockquote>
                  <div
                    className="mx-auto mt-14 flex max-w-md items-center justify-center gap-4"
                    aria-hidden
                  >
                    <span className="h-px flex-1 bg-accent/35" />
                    <span className="text-[15px] leading-none text-accent/90">✦</span>
                    <span className="h-px flex-1 bg-accent/35" />
                  </div>
                </>
              );
            })()
          )}
          {!loading && error ? (
            <p className="mt-6 text-[14px] text-red-400/90">{error}</p>
          ) : null}
        </div>
      </section>

      {/* Our story — dark split layout (layered images + copy), directly after testimonial */}
      {!loading && !error && (
        <section
          id="our-story"
          className="relative overflow-hidden border-y border-white/10 bg-[#0a0908] py-16 md:py-20 lg:py-24"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_20%_50%,rgba(197,157,95,0.05),transparent_60%)]"
            aria-hidden
          />
          {/* Decorative herbs — far right */}
          <div
            className="pointer-events-none absolute -right-2 top-1/2 z-0 hidden h-[min(85vh,440px)] w-36 -translate-y-1/2 xl:block"
            aria-hidden
          >
            <svg
              viewBox="0 0 120 420"
              className="h-full w-full text-emerald-700/75"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M58 8 C52 120 68 240 58 412"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.45"
              />
              {[
                [24, 48, -38],
                [78, 72, 32],
                [32, 118, -28],
                [88, 148, 35],
                [28, 198, -32],
                [82, 232, 30],
                [36, 288, -26],
                [90, 318, 28],
              ].map(([cx, cy, rot], i) => (
                <ellipse
                  key={`${cx}-${cy}`}
                  cx={cx}
                  cy={cy}
                  rx="22"
                  ry="9"
                  opacity={0.35 + (i % 3) * 0.12}
                  transform={`rotate(${rot} ${cx} ${cy})`}
                />
              ))}
            </svg>
          </div>

          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14 xl:gap-20">
              {/* Layered images */}
              <div className="relative mx-auto w-full max-w-xl lg:mx-0 lg:max-w-none">
                <div className="relative aspect-[5/4] w-full min-h-[260px] sm:min-h-[320px]">
                  <img
                    src={heroMainImage}
                    alt="Restaurant interior"
                    className="absolute left-0 top-0 h-[88%] w-[92%] rounded-sm object-cover shadow-[0_24px_48px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
                    sizes="(max-width: 1024px) 92vw, 44vw"
                  />
                  <img
                    src={heroSideImage}
                    alt="Dish from our kitchen"
                    className="absolute bottom-0 right-0 z-10 aspect-square w-[min(52%,280px)] rounded-sm object-cover shadow-[0_20px_40px_rgba(0,0,0,0.5)] ring-2 ring-white/15"
                    sizes="(max-width: 1024px) 45vw, 280px"
                  />
                  <div
                    className="absolute inset-0 rounded-sm bg-gradient-to-tr from-black/25 via-transparent to-transparent pointer-events-none"
                    aria-hidden
                  />
                </div>
              </div>

              {/* Copy */}
              <div className="max-w-xl lg:max-w-none xl:pr-8">
                <div className="flex items-center gap-3">
                  <span className="h-px w-10 shrink-0 bg-accent sm:w-12" aria-hidden />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                    Our story
                  </p>
                </div>
                <h2 className="mt-4 font-sans text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-[2.75rem]">
                  {storyTitle}
                </h2>
                <p className="mt-6 text-[17px] leading-relaxed text-[#a9a9a9]">
                  {storyText}
                </p>
                <ul className="mt-10 grid grid-cols-1 gap-x-10 gap-y-4 sm:grid-cols-2">
                  {OUR_STORY_FEATURES.map((label) => (
                    <li key={label} className="flex items-center gap-3 text-[15px] font-medium text-[#c8c8c8]">
                      <svg
                        className="h-5 w-5 shrink-0 text-accent"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {label}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/menu"
                  className="mt-10 inline-flex min-h-[48px] items-center justify-center rounded-sm bg-accent px-10 py-3.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-wood-950 shadow-lg transition-colors hover:bg-accent-hover"
                >
                  Learn more
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Featured menu categories — split layout (after story) */}
      {!loading && !error && featuredMenuCategorySections.length > 0 && (
        <section className="relative overflow-hidden border-y border-white/10 bg-[#0a0908] py-16 md:py-20 lg:py-24">
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_65%_50%_at_30%_35%,rgba(197,157,95,0.05),transparent_62%)]"
            aria-hidden
          />
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="space-y-16">
              {featuredMenuCategorySections.map((section) => (
                <div
                  key={section.id}
                  className={`grid gap-10 lg:grid-cols-2 lg:gap-14 ${section.reverse ? "lg:[&>*:first-child]:order-2" : ""}`}
                >
                  <div className="max-w-xl lg:pt-1">
                    <div className="flex items-center gap-3">
                      <span className="h-px w-12 bg-accent/90" aria-hidden />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                        {section.eyebrow}
                      </p>
                    </div>
                    <h2 className="mt-3 font-sans text-4xl font-bold leading-tight tracking-tight text-white sm:text-5xl">
                      {section.title}
                    </h2>
                    {section.description ? (
                      <p className="mt-3 text-sm text-white/65">{section.description}</p>
                    ) : null}

                    <ul className="mt-8 space-y-4">
                      {section.items.map((item) => {
                        const itemKey = item.id ?? item.menu_item_id ?? item.name;
                        const subline = item?.description
                          ? item.description
                              .split(/[,.|/-]/)
                              .map((part) => part.trim())
                              .filter(Boolean)
                              .slice(0, 3)
                              .join(" / ")
                          : "Chef / Daily / Special";
                        const displayPrice = getItemDisplayPrice(item);
                        return (
                          <li key={String(itemKey)} className="pb-3">
                            <div className="flex items-baseline gap-2">
                              <h3 className="text-[1.25rem] font-semibold leading-tight text-white">
                                {item.name}
                              </h3>
                              <span className="mb-1 h-px flex-1 border-b border-dotted border-accent/45" />
                              <span className="text-lg font-semibold text-white">
                                {displayPrice != null ? formatPrice(displayPrice) : "—"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-accent/85">
                              {subline}
                            </p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-4 sm:gap-5">
                    <div className="col-span-2 overflow-hidden rounded-sm ring-1 ring-white/12 shadow-[0_20px_40px_rgba(0,0,0,0.45)]">
                      <img
                        src={section.images[0]}
                        alt={`${section.title} showcase`}
                        className="h-52 w-full object-cover sm:h-64 lg:h-72"
                        sizes="(max-width: 1024px) 100vw, 40vw"
                      />
                    </div>
                    <div className="overflow-hidden rounded-sm ring-1 ring-white/12 shadow-[0_16px_32px_rgba(0,0,0,0.45)]">
                      <img
                        src={section.images[1]}
                        alt={`${section.title} detail`}
                        className="h-40 w-full object-cover sm:h-48"
                        sizes="(max-width: 1024px) 50vw, 20vw"
                      />
                    </div>
                    <div className="overflow-hidden rounded-sm ring-1 ring-white/12 shadow-[0_16px_32px_rgba(0,0,0,0.45)]">
                      <img
                        src={section.images[2]}
                        alt={`${section.title} plate`}
                        className="h-40 w-full object-cover sm:h-48"
                        sizes="(max-width: 1024px) 50vw, 20vw"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Parallax — best quality foods (background-attachment: fixed; parent must not use overflow:hidden) */}
      {!loading && (
        <section
          className="relative flex min-h-[min(60vh,520px)] w-full items-center justify-center border-y border-white/10"
          aria-label="Best quality foods"
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
            style={{ backgroundImage: `url(${parallaxQualityBg})` }}
          />
          <div className="absolute inset-0 bg-black/55" aria-hidden />
          <div className="relative z-10 mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 md:py-24">
            <h2 className="font-sans text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[2.75rem]">
              Best Quality Foods
            </h2>
            <div
              className="mx-auto mt-8 flex max-w-md items-center justify-center gap-3 md:mt-10"
              aria-hidden
            >
              <span className="h-px flex-1 bg-accent/80" />
              <span className="shrink-0 text-lg leading-none text-accent">✦</span>
              <span className="h-px flex-1 bg-accent/80" />
            </div>
          </div>
        </section>
      )}

      {/* Services stats — dark split + count-up when in view (resets when scrolled away) */}
      {!loading && (
        <section
          ref={servicesStatsRef}
          className="relative border-y border-white/10 bg-[#0a0908] py-16 md:py-24"
          aria-labelledby="services-fresh-foods-heading"
        >
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_15%_40%,rgba(197,157,95,0.06),transparent_58%)]"
            aria-hidden
          />
          <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Image + floating herbs */}
              <div className="relative mx-auto w-full max-w-lg lg:mx-0 lg:max-w-none">
                <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-visible">
                  <div className="absolute inset-0 overflow-hidden rounded-sm shadow-[0_24px_48px_rgba(0,0,0,0.5)] ring-1 ring-white/12">
                    <img
                      src={specialsMenuShowcaseImages[0] ?? heroMainImage}
                      alt="Signature dish"
                      className="h-full w-full object-cover"
                      sizes="(max-width: 1024px) 90vw, 420px"
                    />
                  </div>
                  <div
                    className="pointer-events-none absolute -left-6 top-8 z-10 h-24 w-20 text-emerald-700/80 sm:-left-4 sm:h-28 sm:w-24"
                    aria-hidden
                  >
                    <svg viewBox="0 0 80 100" className="h-full w-full" fill="currentColor">
                      <ellipse cx="28" cy="22" rx="22" ry="9" opacity="0.85" transform="rotate(-32 28 22)" />
                      <ellipse cx="48" cy="48" rx="24" ry="10" opacity="0.75" transform="rotate(24 48 48)" />
                      <ellipse cx="22" cy="72" rx="18" ry="8" opacity="0.7" transform="rotate(-18 22 72)" />
                    </svg>
                  </div>
                  <div
                    className="pointer-events-none absolute -bottom-2 -right-4 z-10 h-28 w-24 text-emerald-800/75 sm:-right-6 sm:h-32 sm:w-28"
                    aria-hidden
                  >
                    <svg viewBox="0 0 100 120" className="h-full w-full" fill="currentColor">
                      <path
                        d="M52 4 C48 40 55 80 48 118"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        opacity="0.4"
                      />
                      <ellipse cx="72" cy="28" rx="20" ry="8" opacity="0.8" transform="rotate(38 72 28)" />
                      <ellipse cx="38" cy="56" rx="22" ry="9" opacity="0.72" transform="rotate(-22 38 56)" />
                      <ellipse cx="68" cy="78" rx="18" ry="7" opacity="0.65" transform="rotate(12 68 78)" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="max-w-xl lg:max-w-none">
                <div className="flex items-center gap-3">
                  <span className="h-px w-10 shrink-0 bg-accent sm:w-12" aria-hidden />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                    Services
                  </p>
                </div>
                <h2
                  id="services-fresh-foods-heading"
                  className="mt-3 font-sans text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[2.5rem]"
                >
                  Fresh foods
                </h2>
                <p className="mt-6 text-[16px] leading-relaxed text-white/75">
                  We source carefully and cook with intention — so every plate carries clear flavor,
                  balance, and the warmth of a kitchen that cares about the details from prep to
                  service.
                </p>

                <div className="mt-10 grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-8">
                  <div>
                    <svg
                      className="mb-4 h-9 w-9 text-accent"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2M7 2v20M17 12V2v0a5 5 0 015 5v6c0 1.1-.9 2-2 2h-3m0 0v7" />
                    </svg>
                    <div className="relative inline-flex tabular-nums">
                      <span className="text-5xl font-bold leading-none text-white sm:text-6xl">
                        {statFoodVariant}
                      </span>
                      <span
                        className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-accent"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-3 text-sm font-medium text-white/80">Total food items</p>
                  </div>
                  <div>
                    <svg
                      className="mb-4 h-9 w-9 text-accent"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                      <path d="M9 22V12h6v10" />
                    </svg>
                    <div className="relative inline-flex tabular-nums">
                      <span className="text-5xl font-bold leading-none text-white sm:text-6xl">
                        {statPersonCapacity}
                      </span>
                      <span
                        className="absolute -right-2 -top-1 h-2 w-2 rounded-full bg-accent"
                        aria-hidden
                      />
                    </div>
                    <p className="mt-3 text-sm font-medium text-white/80">Total tables</p>
                  </div>
                </div>

                <p className="mt-10 text-[15px] leading-relaxed text-white/70">
                  Your attendant is important for us,{" "}
                  <Link
                    href="/book"
                    className="font-semibold uppercase tracking-[0.12em] text-accent underline decoration-accent/80 underline-offset-4 transition-colors hover:text-accent-hover"
                  >
                    Reserve now
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Parallax testimonial carousel — all quotes slide horizontally over fixed background */}
      {!loading && testimonialParallaxSlides.length > 0 && (
        <section
          className="relative flex min-h-[min(70vh,640px)] w-full flex-col justify-center border-y border-white/10 py-16 md:py-24"
          aria-label="Guest testimonials"
        >
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
            style={{ backgroundImage: `url(${parallaxTestimonialsBg})` }}
          />
          <div className="absolute inset-0 bg-black/62" aria-hidden />

          <div className="relative z-10 mx-auto w-full max-w-4xl px-4 sm:px-6">
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-700 ease-out motion-reduce:transition-none"
                style={{
                  transform: `translate3d(-${testimonialCarouselIndex * 100}%, 0, 0)`,
                }}
              >
                {testimonialParallaxSlides.map((slide, idx) => (
                  <div
                    key={slide.id}
                    className="w-full shrink-0 basis-full px-2 text-center sm:px-6"
                    aria-hidden={idx !== testimonialCarouselIndex}
                  >
                    <div className="mb-6 flex justify-center" aria-hidden>
                      <span
                        className="font-display text-4xl leading-none text-transparent sm:text-5xl"
                        style={{ WebkitTextStroke: "1px rgba(197, 157, 95, 0.92)" }}
                      >
                        “
                      </span>
                    </div>
                    <blockquote className="mx-auto max-w-3xl">
                      <p className="font-sans text-[clamp(1rem,2.4vw,1.2rem)] italic leading-relaxed text-white/95">
                        {slide.quote}
                      </p>
                      <footer className="mt-8 space-y-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-accent">
                          {slide.name}
                        </p>
                        <div className="mx-auto h-px w-16 bg-accent/85" aria-hidden />
                      </footer>
                    </blockquote>
                  </div>
                ))}
              </div>
            </div>

            {testimonialParallaxSlides.length > 1 && (
              <div
                className="mt-10 flex flex-wrap items-center justify-center gap-2"
                role="tablist"
                aria-label="Testimonial slides"
              >
                {testimonialParallaxSlides.map((slide, idx) => (
                  <button
                    key={slide.id}
                    type="button"
                    role="tab"
                    aria-selected={idx === testimonialCarouselIndex}
                    aria-label={`Show testimonial ${idx + 1} of ${testimonialParallaxSlides.length}`}
                    onClick={() => setTestimonialCarouselIndex(idx)}
                    className={`h-2.5 w-2.5 rounded-full transition-colors ${
                      idx === testimonialCarouselIndex
                        ? "bg-accent"
                        : "bg-white/35 hover:bg-white/55"
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <main>
        {!loading && !error && specialItems.length > 0 && (
          <section className="mb-12 md:mb-20">
            <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">
                <div className="mb-2 text-center">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                    This week
                  </p>
                  <h2 className="mt-2 font-sans text-3xl font-extrabold uppercase tracking-[0.05em] text-wood-900 md:text-4xl">
                    Specials menu
                  </h2>
                </div>
                <div className="mb-8 flex flex-col items-center justify-center gap-4">
                  <p className="max-w-2xl text-center font-sans text-[13px] uppercase tracking-[0.08em] text-wood-600 md:text-[14px]">
                    A curated selection of highlighted dishes from our kitchen.
                  </p>
                  <Link
                    href="/menu"
                    className="shrink-0 rounded-sm border border-accent/40 px-5 py-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent transition-colors hover:bg-accent/10"
                  >
                    View full menu
                  </Link>
                </div>

                <div
                  ref={specialsRowRef}
                  className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing md:flex-wrap md:justify-center md:overflow-visible"
                  onMouseDown={handleDragStart}
                  onMouseMove={handleDragMove}
                  onMouseLeave={handleDragEnd}
                  onMouseUp={handleDragEnd}
                >
                  {specialItems.map((item) => {
                    const itemKey = item.id ?? item.menu_item_id;
                    const isActive = activeSpecialId === itemKey;
                    return (
                    <article
                      key={itemKey}
                      className="group relative w-56 shrink-0 overflow-hidden rounded-sm bg-white/5 text-center shadow-md ring-1 ring-white/10 transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                      onClick={() =>
                        setActiveSpecialId((prev) => (prev === itemKey ? null : itemKey))
                      }
                    >
                      <div className="h-56 w-full overflow-hidden bg-black/5">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name ?? "Special item"}
                            className="h-full w-full object-cover transition duration-200 group-hover:blur-sm group-hover:brightness-75"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-wood-300/40 text-wood-700 text-sm font-semibold">
                            {item.name ?? "Special item"}
                          </div>
                        )}
                      </div>

                      <div className="px-3 py-3 space-y-1.5">
                        <h3 className="line-clamp-2 font-sans text-base font-extrabold uppercase tracking-[0.03em] text-wood-900">
                          {item.name}
                        </h3>
                        {item.price != null && item.price !== "" && (
                          <p className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-accent">
                            {formatPrice(item.price)}
                          </p>
                        )}
                      </div>

                      {item.description && (
                        <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-all duration-200 ${
                          isActive ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                        }`}>
                          <div className="mx-1 mb-1 max-h-40 overflow-y-auto rounded-2xl bg-white p-3 font-sans text-[11px] leading-snug text-wood-800 shadow-xl backdrop-blur-md">
                            <p className="whitespace-pre-line text-center">{item.description}</p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addItem(item, 1);
                              }}
                              className="mt-2 w-full rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-wood-950 hover:bg-accent-hover transition-colors pointer-events-auto"
                            >
                              Add to cart
                            </button>
                          </div>
                        </div>
                      )}
                      {!item.description && (
                        <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-all duration-200 ${
                          isActive ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                        }`}>
                          <div className="mx-1 mb-1 rounded-2xl bg-white text-wood-800 text-[11px] leading-snug p-3 shadow-xl backdrop-blur-md">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                addItem(item, 1);
                              }}
                              className="w-full rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-wood-950 hover:bg-accent-hover transition-colors pointer-events-auto"
                            >
                              Add to cart
                            </button>
                          </div>
                        </div>
                      )}
                    </article>
                  )})}
                </div>
              </div>
            </div>
          </section>
        )}

        {!loading && !error && specialMenuListsForUI.length > 0 && (
          <section className="mb-12 md:mb-20">
            <div className="relative left-1/2 right-1/2 w-screen -translate-x-1/2 px-4 sm:px-6 lg:px-8">
              <div className="max-w-6xl mx-auto">
                <div className="mb-8 text-center">
                  <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                    Featured
                  </p>
                  <h2 className="mt-2 font-sans text-3xl font-extrabold uppercase tracking-[0.05em] text-wood-900 md:text-4xl">
                    Special menus
                  </h2>
                </div>

                <div className="space-y-10">
                  {specialMenuListsForUI.map((list) => (
                    <div key={String(list.id)} className="space-y-3 text-center">
                      <h3 className="font-sans text-xl font-extrabold uppercase tracking-[0.04em] text-wood-900 md:text-2xl">
                        {list.name}
                      </h3>
                      <div
                        ref={(el) => {
                          if (el) {
                            specialMenusRowRefs.current[list.id] = el;
                          }
                        }}
                        className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide cursor-grab active:cursor-grabbing md:flex-wrap md:justify-center md:overflow-visible"
                        onMouseDown={handleDragStart}
                        onMouseMove={handleDragMove}
                        onMouseLeave={handleDragEnd}
                        onMouseUp={handleDragEnd}
                      >
                        {list.items.map((item) => {
                          const itemKey = item.id ?? item.menu_category_id ?? item.name;
                          const isActive = activeSpecialMenuItemId === itemKey;
                          return (
                          <article
                            key={itemKey}
                            className="group relative w-56 shrink-0 overflow-hidden rounded-sm border border-white/10 bg-white/5 text-center shadow-md transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-lg"
                            onClick={() =>
                              setActiveSpecialMenuItemId((prev) => (prev === itemKey ? null : itemKey))
                            }
                          >
                            <div className="h-48 w-full overflow-hidden bg-black/5">
                              {item.image_url ? (
                                <img
                                  src={item.image_url}
                                  alt={item.name ?? "Special item"}
                                  className="h-full w-full object-cover transition duration-200 group-hover:blur-sm group-hover:brightness-75"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center bg-wood-300/40 text-wood-700 text-sm font-semibold">
                                  {item.name ? item.name.slice(0, 18) : "Special item"}
                                </div>
                              )}
                            </div>
                            <div className="px-3 py-3 space-y-1.5">
                              <h4 className="line-clamp-2 font-sans text-base font-extrabold uppercase tracking-[0.03em] text-wood-900">
                                {item.name}
                              </h4>
                              {item.price != null && item.price !== "" && (
                                <p className="font-sans text-xs font-semibold uppercase tracking-[0.08em] text-accent">
                                  {formatPrice(item.price)}
                                </p>
                              )}
                            </div>
                            {item.description && (
                              <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-all duration-200 ${
                                isActive ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                              }`}>
                                <div className="mx-1 mb-1 max-h-40 overflow-y-auto rounded-2xl bg-white p-3 font-sans text-[11px] leading-snug text-wood-800 shadow-xl backdrop-blur-md">
                                  <p className="whitespace-pre-line text-center">{item.description}</p>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addItem(item, 1);
                                    }}
                                    className="mt-2 w-full rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-wood-950 hover:bg-accent-hover transition-colors pointer-events-auto"
                                  >
                                    Add to cart
                                  </button>
                                </div>
                              </div>
                            )}
                            {!item.description && (
                              <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 transition-all duration-200 ${
                                isActive ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                              }`}>
                                <div className="mx-1 mb-1 rounded-2xl bg-white text-wood-800 text-[11px] leading-snug p-3 shadow-xl backdrop-blur-md">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addItem(item, 1);
                                    }}
                                    className="w-full rounded-full bg-accent px-3 py-1.5 text-[11px] font-semibold text-wood-950 hover:bg-accent-hover transition-colors pointer-events-auto"
                                  >
                                    Add to cart
                                  </button>
                                </div>
                              </div>
                            )}
                          </article>
                        )})}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Our menus — backend categories (prioritized: Thai, Sushi, Dessert) */}
        {!loading && (
          <section className="border-y border-white/10 bg-[#0a0908] py-16 md:py-24">
            <div className="mx-auto max-w-6xl px-4 sm:px-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-4">
                  <span className="h-px w-10 bg-accent/90 sm:w-14" aria-hidden />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                    {mergedWebsiteContent?.menuShowcaseEyebrow || "Menus"}
                  </p>
                  <span className="h-px w-10 bg-accent/90 sm:w-14" aria-hidden />
                </div>
                <h2 className="mt-4 font-sans text-3xl font-bold tracking-tight text-white md:text-4xl">
                  {mergedWebsiteContent?.menuShowcaseTitle || "Our Menus"}
                </h2>
                <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-relaxed text-white/75">
                  {mergedWebsiteContent?.menuShowcaseIntro ||
                    "Explore Thai favorites, fresh sushi, and house desserts from our live menu."}
                </p>
              </div>
              <div className="mt-12 grid gap-6 sm:gap-8 md:grid-cols-3">
                {menuShowcaseCards.map((card) => (
                  <Link
                    key={card.id}
                    href="/menu"
                    className="group flex flex-col overflow-hidden rounded-sm border border-white/10 bg-white shadow-[0_16px_40px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:-translate-y-1"
                  >
                    <div className="aspect-square overflow-hidden bg-neutral-900">
                      <img
                        src={card.image}
                        alt=""
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                    <div className="flex flex-1 flex-col items-center justify-center px-5 py-7 text-center">
                      <p className="text-[12px] font-semibold uppercase tracking-[0.22em] text-accent">
                        {card.title}
                      </p>
                      <p className="mt-2 text-[14px] leading-snug text-neutral-600">{card.subtext}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Reserve — parallax CTA + solid contact bar */}
        {!loading && (
          <section className="border-y border-white/10" aria-label="Reserve a table">
            <div className="relative flex min-h-[min(52vh,580px)] w-full flex-col justify-center py-16 md:min-h-[min(56vh,620px)] md:py-20">
              <div
                className="absolute inset-0 bg-cover bg-center bg-no-repeat bg-fixed"
                style={{ backgroundImage: `url(${parallaxReserveBg})` }}
              />
              <div className="absolute inset-0 bg-black/58" aria-hidden />
              <div className="relative z-10 mx-auto w-full max-w-6xl px-4 sm:px-6">
                <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-3">
                      <span className="h-px w-12 bg-accent sm:w-14" aria-hidden />
                      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                        Reserve
                      </p>
                    </div>
                    <h2 className="mt-4 font-sans text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
                      Reserve A Table
                    </h2>
                    <p className="mt-5 text-[15px] leading-relaxed text-white/88">
                      Lorem ipsum dolor sit amet, consectetur adipiscing elit. Aenean commodo ligula
                      eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient
                      montes, nascetur ridiculus mus.
                    </p>
                  </div>
                  <div className="flex shrink-0 justify-start lg:justify-end">
                    <Link
                      href="/book"
                      className="inline-flex min-h-[52px] min-w-[220px] items-center justify-center rounded-sm bg-accent px-8 py-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-wood-950 shadow-lg transition-colors hover:bg-accent-hover"
                    >
                      Make a reservation
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-white/10 bg-[#120f0d] px-4 py-10 sm:px-6 md:py-12">
              <div className="mx-auto grid max-w-7xl gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                {[
                  {
                    key: "address",
                    lines: [
                      (restaurant?.address || "").trim() || RESERVE_INFO_FALLBACK.address,
                    ],
                    icon: (
                      <svg
                        className="h-8 w-8 shrink-0 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                        />
                      </svg>
                    ),
                  },
                  {
                    key: "phone",
                    lines: (() => {
                      const p = (restaurant?.phone || "").trim();
                      if (p) return [p];
                      return RESERVE_INFO_FALLBACK.phones.split(/\s*\/\s*/).map((s) => s.trim());
                    })(),
                    icon: (
                      <svg
                        className="h-8 w-8 shrink-0 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                        />
                      </svg>
                    ),
                  },
                  {
                    key: "email",
                    lines: RESERVE_INFO_FALLBACK.emails.split(/\s*\/\s*/).map((s) => s.trim()),
                    icon: (
                      <svg
                        className="h-8 w-8 shrink-0 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                        />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 12l8.689-5.219" />
                      </svg>
                    ),
                  },
                  {
                    key: "hours",
                    lines: (() => {
                      if (openingHours.length > 0) {
                        return [formatOpeningHoursSentence(openingHours)];
                      }
                      return RESERVE_INFO_FALLBACK.hours.split(/\s*\/\s*/).map((s) => s.trim());
                    })(),
                    icon: (
                      <svg
                        className="h-8 w-8 shrink-0 text-accent"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        aria-hidden
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    ),
                  },
                ].map((item) => (
                  <div key={item.key} className="flex gap-4">
                    {item.icon}
                    <div className="min-w-0 space-y-1 text-[13px] leading-snug text-accent sm:text-sm">
                      {item.lines.map((line, i) => (
                        <p key={`${item.key}-${i}`}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Google maps - full width at the bottom */}
        <section className="mt-12 md:mt-16 w-screen relative left-1/2 -translate-x-1/2">
          <div className="h-[320px] sm:h-[380px] md:h-[450px] w-full overflow-hidden">
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d4231.171322082289!2d-8.039781087827244!3d37.088382151284655!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd1ab38d371e8551%3A0x2ccff38b60622e49!2sThai%20%26%20maki!5e1!3m2!1sen!2spt!4v1776627997711!5m2!1sen!2spt"
              width="100%"
              height="100%"
              style={{ border: 0, width: "100%", height: "100%" }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </section>
      </main>
    </div>
  );
}
