const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Kept so stale imports do not crash the Next build. Google fetch lives on Laravel. */
export const GOOGLE_PLACE_REVIEW_FIELDS =
  "rating,userRatingCount,reviews,googleMapsUri,displayName";
export const GOOGLE_PLACE_SYNC_FIELDS =
  "id,displayName,formattedAddress,addressComponents,location,regularOpeningHours,nationalPhoneNumber,rating,userRatingCount,googleMapsUri";

export async function fetchGooglePlace() {
  return {
    ok: false,
    error: "Google Place fetch moved to Laravel. Use POST /restaurants/{id}/google-place.",
    status: 0,
  };
}

export function resolvePlaceId(fromContent, fromBody) {
  const body = String(fromBody ?? "").trim();
  if (body) return body;
  const contentId =
    (fromContent && typeof fromContent === "object"
      ? fromContent.google_place_id || fromContent.googlePlaceId
      : "") || "";
  return String(contentId).trim();
}

export function extractWebsiteContentJson(payload) {
  if (!payload || typeof payload !== "object") return {};
  const raw =
    payload.content_json ?? payload.data?.content_json ?? payload.data ?? payload;
  return raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

/** Snap Google hour/minute to the dashboard's 15-minute slots. */
export function formatQuarterTime(hour, minute) {
  let total = Math.max(0, Number(hour || 0) * 60 + Number(minute || 0));
  total = Math.round(total / 15) * 15;
  if (total >= 24 * 60) total = 24 * 60 - 15;
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${pad2(h)}:${pad2(m)}:00`;
}

/**
 * Map Places API (New) regularOpeningHours.periods → owner opening_slots.
 * Google day: 0 = Sunday … 6 = Saturday.
 */
export function periodsToOpeningSlots(regularOpeningHours) {
  const periods = regularOpeningHours?.periods;
  if (!Array.isArray(periods) || periods.length === 0) return [];

  return periods
    .filter((p) => p?.open && typeof p.open.day === "number")
    .map((p) => {
      const dayName = DAY_NAMES[p.open.day] || "monday";
      return {
        day_of_week: dayName,
        open_time: formatQuarterTime(p.open.hour, p.open.minute),
        close_time: p.close
          ? formatQuarterTime(p.close.hour, p.close.minute)
          : "23:45:00",
      };
    });
}

function addressComponent(place, type) {
  const list = Array.isArray(place?.addressComponents) ? place.addressComponents : [];
  const match = list.find((c) => Array.isArray(c?.types) && c.types.includes(type));
  return String(match?.longText || match?.long_name || "").trim();
}

export function formattedAddressFromPlace(place) {
  if (!place || typeof place !== "object") return "";
  if (place.formattedAddress) return String(place.formattedAddress).trim();
  const streetNumber = addressComponent(place, "street_number");
  const route = addressComponent(place, "route");
  const street = [streetNumber, route].filter(Boolean).join(" ");
  const locality = addressComponent(place, "locality") || addressComponent(place, "postal_town");
  const postal = addressComponent(place, "postal_code");
  return [street, postal, locality].filter(Boolean).join(", ");
}

export function postalAddressFromPlace(place) {
  if (!place || typeof place !== "object") return null;
  const formatted = formattedAddressFromPlace(place);
  if (!formatted) return null;
  const streetNumber = addressComponent(place, "street_number");
  const route = addressComponent(place, "route");
  return {
    "@type": "PostalAddress",
    streetAddress: [streetNumber, route].filter(Boolean).join(" ") || formatted,
    addressLocality:
      addressComponent(place, "locality") || addressComponent(place, "postal_town") || undefined,
    postalCode: addressComponent(place, "postal_code") || undefined,
    addressRegion: addressComponent(place, "administrative_area_level_1") || undefined,
    addressCountry: addressComponent(place, "country") || "PT",
  };
}
