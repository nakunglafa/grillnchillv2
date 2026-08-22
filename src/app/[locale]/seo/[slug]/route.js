import { NextResponse } from "next/server";
import { getRestaurantBySlug, locationPath, menuPath } from "@/lib/restaurants";
import { getBranchCopy } from "@/lib/branch-copy";
import { fetchGooglePlaceReviews, getRestaurant } from "@/lib/api";
import { DEFAULT_LOCALE, isLocale, localizedPath } from "@/lib/i18n";
import { extractWebsiteContentFromPayload, mergeWebsiteContent } from "@/lib/website-content";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");

export const dynamic = "force-dynamic";

/**
 * Machine-readable branch SEO JSON for AI crawlers.
 * GET /[locale]/seo/[slug]
 */
export async function GET(_request, { params }) {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const catalog = getRestaurantBySlug(slug);
  if (!catalog) {
    return NextResponse.json({ error: "Unknown location" }, { status: 404 });
  }

  const copy = getBranchCopy(slug, locale);
  let restaurant = null;
  let rating = null;
  let userRatingCount = null;
  let address = catalog.addressFallback || null;
  let phone = null;
  let placeId = catalog.googlePlaceId || null;

  try {
    const data = await getRestaurant(catalog.id);
    restaurant = data?.restaurant ?? data?.data ?? null;
    address = restaurant?.address || address;
    phone = restaurant?.phone || null;
    const content = mergeWebsiteContent(
      catalog.id,
      extractWebsiteContentFromPayload(data)
    );
    if (content?.google_place_id) placeId = content.google_place_id;
  } catch {
    // keep fallbacks
  }

  try {
    const payload = await fetchGooglePlaceReviews(catalog.id);
    const body = payload?.data && payload.rating == null ? payload.data : payload;
    if (typeof body?.rating === "number") rating = body.rating;
    if (typeof body?.userRatingCount === "number") userRatingCount = body.userRatingCount;
    else if (typeof body?.user_rating_count === "number") userRatingCount = body.user_rating_count;
  } catch {
    // optional
  }

  const name = restaurant?.name || catalog.label;
  const pageUrl = `${SITE_URL}${locationPath(catalog, locale)}`;
  const menuUrl = `${SITE_URL}${menuPath(catalog, locale)}`;
  const bookingUrl = `${SITE_URL}${localizedPath(locale, "/book")}`;
  const mapsUrl = placeId
    ? `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`
    : null;

  return NextResponse.json(
    {
      name,
      slug,
      locale,
      positioning: copy?.headline || null,
      description: copy?.seoDescription || catalog.seoDescription,
      intro: copy?.intro || null,
      venueLabel: copy?.venueLabel || catalog.venueLabel,
      cuisines:
        catalog.venueType === "bakery"
          ? ["Bakery", "Café", "Pastries", "Custom cakes", "Birthday cakes"]
          : copy?.cuisines || ["Nepali", "Indian", "Portuguese", "Grill"],
      areaServed: catalog.areaServed || ["Lisbon"],
      keywords: copy?.keywords || [],
      knowsAbout: copy?.knowsAbout || [],
      address,
      city: "Lisbon",
      country: "PT",
      phone,
      rating,
      userRatingCount,
      orderType: "pickup",
      delivery: false,
      bookingUrl,
      menuUrl,
      pageUrl,
      sameAs: mapsUrl ? [mapsUrl] : [],
      brand: "Grill N Chill",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Content-Type": "application/json; charset=utf-8",
        "X-Robots-Tag": "noindex, nofollow",
      },
    }
  );
}
