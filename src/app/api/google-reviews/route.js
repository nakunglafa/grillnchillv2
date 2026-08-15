import { NextResponse } from "next/server";
import { fetchGooglePlaceReviews } from "@/lib/api";
import {
  CONFIGURED_RESTAURANTS,
  getEnvGooglePlaceIdForSlug,
  getRestaurantById,
  getRestaurantBySlug,
} from "@/lib/restaurants";

export const dynamic = "force-dynamic";

const EMPTY_REVIEWS = {
  rating: null,
  userRatingCount: null,
  reviews: [],
  googleMapsUri: null,
  placeId: null,
  displayName: null,
};

function jsonNoStore(body, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function normalizePlacePayload(payload) {
  const body = payload?.data && payload.rating == null ? payload.data : payload;
  return {
    rating: body?.rating ?? null,
    userRatingCount: body?.userRatingCount ?? body?.user_rating_count ?? null,
    googleMapsUri: body?.googleMapsUri ?? body?.google_maps_uri ?? null,
    displayName: body?.displayName ?? body?.display_name ?? null,
    placeId: body?.placeId ?? body?.place_id ?? null,
    reviews: Array.isArray(body?.reviews) ? body.reviews : [],
    cached: Boolean(body?.cached),
    stale: Boolean(body?.stale),
  };
}

function mapGoogleReviews(data) {
  return Array.isArray(data?.reviews)
    ? data.reviews.map((r) => ({
        author: r.authorAttribution?.displayName || "Google user",
        authorUri: r.authorAttribution?.uri || null,
        photoUri: r.authorAttribution?.photoUri || null,
        rating: typeof r.rating === "number" ? r.rating : null,
        text: r.text?.text || r.originalText?.text || "",
        relativeTime: r.relativePublishTimeDescription || "",
        publishTime: r.publishTime || null,
      }))
    : [];
}

/**
 * Bootstrap only: when Laravel has no Place ID yet, use env GOOGLE_PLACE_ID* +
 * GOOGLE_PLACES_API_KEY until Owner → Settings saves website_content.
 */
async function fetchEnvBootstrap(placeId) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey || !placeId) return null;

  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri,displayName",
    },
    next: { revalidate: 7200 },
  });
  if (!res.ok) return null;
  const data = await res.json();
  return {
    rating: typeof data.rating === "number" ? data.rating : null,
    userRatingCount: typeof data.userRatingCount === "number" ? data.userRatingCount : null,
    googleMapsUri: data.googleMapsUri || null,
    displayName: data.displayName?.text || null,
    placeId,
    reviews: mapGoogleReviews(data),
    cached: false,
    stale: false,
    bootstrap: true,
  };
}

async function fetchOne(restaurantId, slug) {
  try {
    const payload = await fetchGooglePlaceReviews(restaurantId);
    const normalized = normalizePlacePayload(payload);
    if (normalized.rating != null || normalized.reviews.length > 0) {
      return { restaurantId: Number(restaurantId), ...normalized };
    }
  } catch (err) {
    const message =
      err?.data?.error ||
      err?.data?.message ||
      err?.message ||
      "Laravel Google Place endpoint is not available";
    const envPlaceId =
      (slug && getEnvGooglePlaceIdForSlug(slug)) ||
      getRestaurantById(restaurantId)?.googlePlaceId ||
      null;
    if (envPlaceId) {
      try {
        const boot = await fetchEnvBootstrap(envPlaceId);
        if (boot) return { restaurantId: Number(restaurantId), ...boot };
      } catch {
        // fall through
      }
    }
    return {
      restaurantId: Number(restaurantId),
      ...EMPTY_REVIEWS,
      error: message,
    };
  }

  const envPlaceId =
    (slug && getEnvGooglePlaceIdForSlug(slug)) ||
    getRestaurantById(restaurantId)?.googlePlaceId ||
    null;
  if (envPlaceId) {
    try {
      const boot = await fetchEnvBootstrap(envPlaceId);
      if (boot) return { restaurantId: Number(restaurantId), ...boot };
    } catch {
      // ignore
    }
  }

  return {
    restaurantId: Number(restaurantId),
    ...EMPTY_REVIEWS,
    error: "Google Place ID is not set. Save it in Owner → Settings.",
  };
}

function aggregateLocations(locations) {
  let weightedSum = 0;
  let totalCount = 0;
  const reviews = [];

  for (const loc of locations) {
    const rating = typeof loc.rating === "number" ? loc.rating : null;
    const count = typeof loc.userRatingCount === "number" ? loc.userRatingCount : 0;
    if (rating != null && count > 0) {
      weightedSum += rating * count;
      totalCount += count;
    } else if (rating != null) {
      weightedSum += rating;
      totalCount += 1;
    }
    if (Array.isArray(loc.reviews)) {
      for (const review of loc.reviews) {
        reviews.push({
          ...review,
          locationSlug: loc.slug,
          locationLabel: loc.label,
        });
      }
    }
  }

  reviews.sort((a, b) => {
    const ta = a.publishTime ? Date.parse(a.publishTime) : 0;
    const tb = b.publishTime ? Date.parse(b.publishTime) : 0;
    return tb - ta;
  });

  return {
    rating: totalCount > 0 ? Math.round((weightedSum / totalCount) * 10) / 10 : null,
    userRatingCount: totalCount > 0 ? totalCount : null,
    reviews: reviews.slice(0, 12),
    googleMapsUri: null,
    placeId: null,
    displayName: null,
  };
}

/**
 * Proxy to Laravel POST /restaurants/{id}/google-place.
 * Query: ?slug= | ?restaurantId= | ?all=1
 * Env Place IDs bootstrap only until Settings saves website_content.
 */
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const all = searchParams.get("all") === "1" || searchParams.get("all") === "true";
  const slug = searchParams.get("slug");
  const restaurantIdParam = searchParams.get("restaurantId");

  if (all) {
    const locations = await Promise.all(
      CONFIGURED_RESTAURANTS.map(async (catalog) => {
        const place = await fetchOne(catalog.id, catalog.slug);
        return {
          ...place,
          id: catalog.id,
          slug: catalog.slug,
          label: catalog.shortLabel || catalog.label,
        };
      })
    );
    return jsonNoStore({
      locations,
      aggregate: aggregateLocations(locations),
    });
  }

  let restaurantId = restaurantIdParam ? Number(restaurantIdParam) : null;
  let resolvedSlug = slug;
  if (!restaurantId && slug) {
    const catalog = getRestaurantBySlug(slug);
    if (!catalog) {
      return jsonNoStore({ ...EMPTY_REVIEWS, error: "Unknown location slug" });
    }
    restaurantId = catalog.id;
  }

  if (!restaurantId || Number.isNaN(restaurantId)) {
    return jsonNoStore({
      ...EMPTY_REVIEWS,
      error: "Provide slug, restaurantId, or all=1",
    });
  }

  const catalog = getRestaurantById(restaurantId);
  if (!catalog) {
    return jsonNoStore({ ...EMPTY_REVIEWS, error: "Unknown restaurant id" });
  }
  resolvedSlug = resolvedSlug || catalog.slug;

  const place = await fetchOne(restaurantId, resolvedSlug);
  const status = place.error && place.rating == null ? 502 : 200;
  return jsonNoStore(place, status);
}
