/**
 * Configured Grill N Chill locations from env (Digitallisbon restaurant IDs).
 */

import { localizedPath } from "@/lib/i18n";

const FALLBACK_SHORT = ["Praça do Chile", "Intendente", "Bakery"];
const FALLBACK_SLUGS = ["praca-do-chile", "intendente", "bakery"];
const VENUE_TYPES = ["restaurant", "restaurant", "bakery"];

const NEARBY_BY_SLUG = {
  "praca-do-chile": [
    {
      name: "Praça do Chile",
      blurb: "The square that gives the restaurant its name — cafés and tram lines at the doorstep.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Pra%C3%A7a+do+Chile+Lisbon",
    },
    {
      name: "Avenida Almirante Reis",
      blurb: "A main artery of eastern Lisbon, a short stroll for a post-dinner walk.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Avenida+Almirante+Reis+Lisbon",
    },
    {
      name: "Arroios",
      blurb: "Neighbourhood streets, local shops and easy metro access nearby.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Arroios+Lisbon",
    },
  ],
  intendente: [
    {
      name: "Largo do Intendente",
      blurb: "The lively square at the heart of Intendente — murals, bars and late evenings.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Largo+do+Intendente+Lisbon",
    },
    {
      name: "Martim Moniz",
      blurb: "Multicultural square and tram hub a short walk downhill.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Martim+Moniz+Lisbon",
    },
    {
      name: "Miradouro da Senhora do Monte",
      blurb: "One of Lisbon’s classic viewpoints, a climb away for sunset views.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Miradouro+da+Senhora+do+Monte",
    },
  ],
  bakery: [
    {
      name: "Praça do Chile",
      blurb: "The square outside the bakery — trams, cafés and the main Grill N Chill restaurant nearby.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Pra%C3%A7a+do+Chile+Lisbon",
    },
    {
      name: "Alameda",
      blurb: "A short walk toward Alameda metro — easy pickup for cakes and custom orders.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Alameda+Lisbon+metro",
    },
    {
      name: "Arroios",
      blurb: "Quiet residential streets and local shops just around the corner.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Arroios+Lisbon",
    },
  ],
};

const SEO_BY_SLUG = {
  "praca-do-chile":
    "Grill N Chill Praça do Chile — lunch and dinner restaurant in Lisbon. Menu, hours, table booking and private events near Praça do Chile.",
  intendente:
    "Grill N Chill Intendente — lunch and dinner restaurant in Lisbon. Live menu, hours and table reservations near Largo do Intendente.",
  bakery:
    "Custom cakes and cake shop in Lisbon near Alameda, Arroios and Praça do Chile. The Bakery by Grill N Chill — ready-made cakes, birthday cakes and custom cake pickup.",
};

const AREA_BY_SLUG = {
  "praca-do-chile": ["Praça do Chile", "Arroios", "Almirante Reis", "Lisbon"],
  intendente: ["Intendente", "Martim Moniz", "Anjos", "Lisbon"],
  bakery: ["Alameda", "Arroios", "Praça do Chile", "Lisbon"],
};

function placeIdForIndex(index) {
  const keyed = [
    process.env.GOOGLE_PLACE_ID1,
    process.env.GOOGLE_PLACE_ID2,
    process.env.GOOGLE_PLACE_ID3,
  ];
  if (keyed[index]) return keyed[index];
  if (index === 0 && process.env.GOOGLE_PLACE_ID) return process.env.GOOGLE_PLACE_ID;
  return null;
}

/** Env Place IDs are bootstrap only until Settings saves website_content.google_place_id. */
export function getEnvGooglePlaceIdForIndex(index) {
  return placeIdForIndex(index);
}

export function getEnvGooglePlaceIdForSlug(slug) {
  const index = FALLBACK_SLUGS.indexOf(slug);
  if (index < 0) return null;
  return placeIdForIndex(index);
}

function displayNameForIndex(index) {
  const names = [
    process.env.NEXT_PUBLIC_RESTAURANT_DISPLAY_NAME1,
    process.env.NEXT_PUBLIC_RESTAURANT_DISPLAY_NAME2,
    process.env.NEXT_PUBLIC_RESTAURANT_DISPLAY_NAME3,
  ];
  return names[index]?.trim() || null;
}

function addressForIndex(index) {
  const addresses = [
    process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS1,
    process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS2,
    process.env.NEXT_PUBLIC_RESTAURANT_ADDRESS3,
  ];
  return addresses[index]?.trim() || "";
}

function readConfiguredRestaurants() {
  const prefix = process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX || "Grill N Chill";
  const ids = [
    process.env.NEXT_PUBLIC_RESTAURANT_ID1,
    process.env.NEXT_PUBLIC_RESTAURANT_ID2,
    process.env.NEXT_PUBLIC_RESTAURANT_ID3,
  ];

  return ids
    .map((raw, index) => {
      const id = Number(raw);
      if (!id || Number.isNaN(id)) return null;
      const slug = FALLBACK_SLUGS[index] || `location-${id}`;
      const shortLabel = FALLBACK_SHORT[index] || `${prefix} #${index + 1}`;
      const venueType = VENUE_TYPES[index] || "restaurant";
      const displayName = displayNameForIndex(index);
      const addressFallback = addressForIndex(index);
      return {
        id,
        slug,
        shortLabel,
        label: displayName || (FALLBACK_SHORT[index]
          ? `${prefix} — ${FALLBACK_SHORT[index]}`
          : `${prefix} #${index + 1}`),
        addressFallback,
        venueType,
        venueLabel: venueType === "bakery" ? "Bakery & café" : "Restaurant",
        seoDescription: SEO_BY_SLUG[slug] || `${prefix} — ${shortLabel}, Lisbon.`,
        areaServed: AREA_BY_SLUG[slug] || ["Lisbon"],
        nearbyFallback: NEARBY_BY_SLUG[slug] || [],
        googlePlaceId: placeIdForIndex(index),
        offersPrivateEvents: slug === "praca-do-chile",
        offersTableReservations: venueType !== "bakery",
      };
    })
    .filter(Boolean);
}

export const CONFIGURED_RESTAURANTS = readConfiguredRestaurants();

export const LOCATION_SLUGS = CONFIGURED_RESTAURANTS.map((r) => r.slug);

/** Default / primary location ID (first configured). */
export function getDefaultRestaurantId() {
  return CONFIGURED_RESTAURANTS[0]?.id ?? null;
}

/** Default location slug (first configured). */
export function getDefaultLocationSlug() {
  return CONFIGURED_RESTAURANTS[0]?.slug ?? null;
}

/** All configured IDs as numbers. */
export function getConfiguredRestaurantIds() {
  return CONFIGURED_RESTAURANTS.map((r) => r.id);
}

export function isConfiguredRestaurantId(id) {
  const n = Number(id);
  return CONFIGURED_RESTAURANTS.some((r) => r.id === n);
}

export function isLocationSlug(slug) {
  if (!slug || typeof slug !== "string") return false;
  return LOCATION_SLUGS.includes(slug);
}

export function getRestaurantBySlug(slug) {
  if (!slug) return null;
  return CONFIGURED_RESTAURANTS.find((r) => r.slug === slug) || null;
}

export function getSlugForId(id) {
  const n = Number(id);
  return CONFIGURED_RESTAURANTS.find((r) => r.id === n)?.slug ?? null;
}

export function getRestaurantById(id) {
  const n = Number(id);
  return CONFIGURED_RESTAURANTS.find((r) => r.id === n) || null;
}

export function getGooglePlaceIdForSlug(slug) {
  return getRestaurantBySlug(slug)?.googlePlaceId || null;
}

/**
 * Prefer website_content Place ID; fall back to env bootstrap Place ID.
 * @param {string} slug
 * @param {string} [contentPlaceId]
 */
export function resolveLocationPlaceId(slug, contentPlaceId) {
  const fromContent = String(contentPlaceId || "").trim();
  if (fromContent) return fromContent;
  return getEnvGooglePlaceIdForSlug(slug) || getGooglePlaceIdForSlug(slug) || null;
}

/** Path helpers — accept catalog row or { slug }. Optional locale prefixes the path. */
export function locationPath(r, locale) {
  const slug = typeof r === "string" ? r : r?.slug;
  const bare = slug ? `/${slug}` : "/";
  return locale ? localizedPath(locale, bare) : bare;
}

export function menuPath(r, locale) {
  const slug = typeof r === "string" ? r : r?.slug;
  const bare = slug ? `/${slug}/menu` : "/menu";
  return locale ? localizedPath(locale, bare) : bare;
}

/** Custom cake order form — bakery venues only. */
export function cakeOrderPath(r, locale) {
  const slug = typeof r === "string" ? r : r?.slug;
  const bare = slug ? `/${slug}/order-cake` : "/bakery/order-cake";
  return locale ? localizedPath(locale, bare) : bare;
}

export function restaurantOffersReservations(restaurantOrId) {
  if (restaurantOrId == null) return false;
  if (typeof restaurantOrId === "object") {
    if (typeof restaurantOrId.offersTableReservations === "boolean") {
      return restaurantOrId.offersTableReservations;
    }
    return restaurantOrId.venueType !== "bakery";
  }
  const row = getRestaurantById(restaurantOrId);
  return row ? row.offersTableReservations !== false && row.venueType !== "bakery" : true;
}

export function isBakeryRestaurant(restaurantOrId) {
  if (restaurantOrId == null) return false;
  if (typeof restaurantOrId === "object") {
    return restaurantOrId.venueType === "bakery";
  }
  return getRestaurantById(restaurantOrId)?.venueType === "bakery";
}

/** Menu item ID for custom cake createOrder (owner creates once in Menu). */
export function getBakeryCustomCakeItemId() {
  const raw = process.env.NEXT_PUBLIC_BAKERY_CUSTOM_CAKE_ITEM_ID;
  const id = Number(raw);
  return id && !Number.isNaN(id) ? id : null;
}
