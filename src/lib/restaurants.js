/**
 * Configured Grill N Chill locations from env (Digitallisbon restaurant IDs).
 */

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
      name: "Arroios",
      blurb: "Quiet residential streets and local shops just around the corner.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Arroios+Lisbon",
    },
    {
      name: "Avenida Almirante Reis",
      blurb: "A short walk for a stroll after coffee and cake.",
      mapsUrl: "https://www.google.com/maps/search/?api=1&query=Avenida+Almirante+Reis+Lisbon",
    },
  ],
};

const SEO_BY_SLUG = {
  "praca-do-chile":
    "Grill N Chill Praça do Chile — lunch and dinner restaurant in Lisbon. Menu, hours, table booking and private events near Praça do Chile.",
  intendente:
    "Grill N Chill Intendente — lunch and dinner restaurant in Lisbon. Live menu, hours and table reservations near Largo do Intendente.",
  bakery:
    "Grill N Chill Bakery — café and bakery in Lisbon. Coffee, pastries and light bites. Menu, hours and visit info.",
};

const AREA_BY_SLUG = {
  "praca-do-chile": ["Praça do Chile", "Arroios", "Almirante Reis", "Lisbon"],
  intendente: ["Intendente", "Martim Moniz", "Anjos", "Lisbon"],
  bakery: ["Praça do Chile", "Arroios", "Almirante Reis", "Lisbon"],
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

/** Path helpers — accept catalog row or { slug }. */
export function locationPath(r) {
  const slug = typeof r === "string" ? r : r?.slug;
  return slug ? `/${slug}` : "/";
}

export function menuPath(r) {
  const slug = typeof r === "string" ? r : r?.slug;
  return slug ? `/${slug}/menu` : "/menu";
}
