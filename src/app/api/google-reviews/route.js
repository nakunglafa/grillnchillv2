import { NextResponse } from "next/server";
import { getGooglePlaceIdForSlug, getRestaurantBySlug } from "@/lib/restaurants";

export const revalidate = 7200; // 2 hours

const FALLBACK_PLACE_ID = process.env.GOOGLE_PLACE_ID || "ChIJUYUeN42zGg0RSS5iYIvzzyw";

function emptyReviews(error) {
  return NextResponse.json(
    {
      rating: null,
      userRatingCount: null,
      reviews: [],
      googleMapsUri: null,
      error: error || undefined,
    },
    { status: 200 }
  );
}

/**
 * Server-only proxy for Google Places Place Details (rating + reviews).
 * Query: ?slug=praca-do-chile | ?placeId=ChIJ...
 * Never expose GOOGLE_PLACES_API_KEY to the client.
 */
export async function GET(request) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    return emptyReviews("Google Places API key not configured (set GOOGLE_PLACES_API_KEY)");
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const placeIdParam = searchParams.get("placeId");

  let placeId = placeIdParam || null;
  if (!placeId && slug) {
    if (!getRestaurantBySlug(slug)) {
      return emptyReviews("Unknown location slug");
    }
    placeId = getGooglePlaceIdForSlug(slug);
  }
  if (!placeId) {
    placeId = FALLBACK_PLACE_ID;
  }

  try {
    const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
    const res = await fetch(url, {
      headers: {
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "rating,userRatingCount,reviews,googleMapsUri,displayName",
      },
      next: { revalidate: 7200 },
    });

    if (!res.ok) {
      const errBody = await res.json().catch(() => null);
      const errText = errBody?.error?.message || "";
      console.error("Google Places API error:", res.status, errBody || errText);

      let hint = "Failed to fetch reviews";
      if (res.status === 403) {
        hint =
          "Google Places permission denied — enable Billing on the Google Cloud project, enable Places API (New), and allow this API key to use Places API.";
      } else if (res.status === 400) {
        hint = "Invalid Place ID or request. Check GOOGLE_PLACE_ID / GOOGLE_PLACE_ID1–3.";
      }

      return NextResponse.json(
        {
          rating: null,
          userRatingCount: null,
          reviews: [],
          googleMapsUri: null,
          error: hint,
          googleMessage: errText || undefined,
        },
        { status: 200 }
      );
    }

    const data = await res.json();
    const reviews = Array.isArray(data.reviews)
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

    return NextResponse.json({
      rating: typeof data.rating === "number" ? data.rating : null,
      userRatingCount: typeof data.userRatingCount === "number" ? data.userRatingCount : null,
      googleMapsUri: data.googleMapsUri || null,
      displayName: data.displayName?.text || null,
      reviews,
    });
  } catch (err) {
    console.error("Google Places fetch failed:", err);
    return emptyReviews("Failed to fetch reviews");
  }
}
