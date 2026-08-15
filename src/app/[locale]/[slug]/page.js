import { notFound } from "next/navigation";
import {
  getRestaurantBySlug,
  LOCATION_SLUGS,
  locationPath,
  menuPath,
} from "@/lib/restaurants";
import { fetchGooglePlaceReviews, getRestaurant } from "@/lib/api";
import { buildLocationFavorites } from "@/lib/location-favorites";
import { LocationPageClient } from "@/components/LocationPageClient";
import {
  getFeatureImage,
  mergeWebsiteContent,
} from "@/lib/website-content";
import { getBranchCopy } from "@/lib/branch-copy";
import { buildHrefLangAlternates, isLocale, DEFAULT_LOCALE } from "@/lib/i18n";
import { openingSlotsToSchema } from "@/lib/schema-hours";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");
const BRAND =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
  "Grill N Chill";

const OG_LOCALE = {
  en: "en_GB",
  pt: "pt_PT",
  fr: "fr_FR",
  de: "de_DE",
  nl: "nl_NL",
  es: "es_ES",
};

function absUrl(pathOrUrl) {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

function mapsUrlFromPlaceId(placeId) {
  if (!placeId) return undefined;
  return `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(placeId)}`;
}

async function loadPlaceRating(restaurantId) {
  try {
    const payload = await fetchGooglePlaceReviews(restaurantId);
    const body = payload?.data && payload.rating == null ? payload.data : payload;
    const rating = typeof body?.rating === "number" ? body.rating : null;
    const count =
      typeof body?.userRatingCount === "number"
        ? body.userRatingCount
        : typeof body?.user_rating_count === "number"
          ? body.user_rating_count
          : null;
    if (rating == null) return null;
    return { rating, count };
  } catch {
    return null;
  }
}

export function generateStaticParams() {
  return LOCATION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug, locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const catalog = getRestaurantBySlug(slug);
  if (!catalog) return { title: "Location" };

  const copy = getBranchCopy(slug, locale);
  const barePath = locationPath(catalog);
  const path = locationPath(catalog, locale);
  const canonical = `${SITE_URL}${path}`;
  const fallbackDescription =
    copy?.seoDescription || catalog.seoDescription || `${catalog.label} — Grill N Chill Lisbon.`;

  try {
    const data = await getRestaurant(catalog.id);
    const api = data?.restaurant ?? data?.data ?? data;
    const name = api?.name || catalog.label;
    const title = copy?.seoTitle || name;
    const description = copy?.seoDescription || fallbackDescription;
    const content = mergeWebsiteContent(
      catalog.id,
      data?.website_content ?? api?.website_content ?? null
    );
    const image = absUrl(
      getFeatureImage(content) || api?.logo_url || api?.logoUrl || undefined
    );

    return {
      title,
      description,
      keywords: copy?.keywords || [
        ...(catalog.areaServed || []),
        "Grill N Chill",
        "Lisbon",
        catalog.venueLabel,
      ].filter(Boolean),
      alternates: {
        canonical: path,
        languages: buildHrefLangAlternates(SITE_URL, barePath),
      },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: BRAND,
        locale: OG_LOCALE[locale] || "en_GB",
        type: "website",
        images: image ? [{ url: image }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: image ? [image] : undefined,
      },
    };
  } catch {
    const title = copy?.seoTitle || catalog.label;
    return {
      title,
      description: fallbackDescription,
      keywords: copy?.keywords,
      alternates: {
        canonical: path,
        languages: buildHrefLangAlternates(SITE_URL, barePath),
      },
      openGraph: {
        title,
        description: fallbackDescription,
        url: canonical,
        siteName: BRAND,
        locale: OG_LOCALE[locale] || "en_GB",
        type: "website",
      },
      twitter: {
        card: "summary",
        title,
        description: fallbackDescription,
      },
    };
  }
}

function buildJsonLd({
  catalog,
  restaurant,
  path,
  menuUrl,
  homeUrl,
  featureImage,
  copy,
  openingSlots,
  aggregateRating,
  locale,
}) {
  const name = restaurant?.name || catalog.label;
  const schemaType = catalog.venueType === "bakery" ? "Bakery" : "Restaurant";
  const url = `${SITE_URL}${path}`;
  const address =
    restaurant?.address || catalog.addressFallback || undefined;
  const mapsUrl = mapsUrlFromPlaceId(catalog.googlePlaceId);
  const description = copy?.seoDescription || catalog.seoDescription;
  const hours = openingSlotsToSchema(openingSlots);

  const localBusiness = {
    "@type": schemaType,
    "@id": `${url}#venue`,
    name,
    url,
    description,
    telephone: restaurant?.phone || undefined,
    email: restaurant?.email || undefined,
    image: absUrl(featureImage || restaurant?.logo_url || restaurant?.logoUrl),
    address: address
      ? {
          "@type": "PostalAddress",
          streetAddress: address,
          addressLocality: "Lisbon",
          addressCountry: "PT",
        }
      : undefined,
    areaServed: (catalog.areaServed || []).map((a) => ({
      "@type": "Place",
      name: a,
    })),
    servesCuisine:
      catalog.venueType === "bakery"
        ? ["Bakery", "Café", "Pastries", "Custom cakes", "Birthday cakes"]
        : copy?.cuisines || ["Nepali", "Portuguese", "Indian", "Grill"],
    knowsAbout: copy?.knowsAbout,
    openingHoursSpecification: hours,
    hasMenu: menuUrl,
    menu: menuUrl,
    sameAs: mapsUrl ? [mapsUrl] : undefined,
    aggregateRating:
      aggregateRating?.rating != null
        ? {
            "@type": "AggregateRating",
            ratingValue: aggregateRating.rating,
            reviewCount: aggregateRating.count || undefined,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
  };

  const breadcrumb = {
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: homeUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: catalog.shortLabel || name,
        item: url,
      },
    ],
  };

  const graph = [localBusiness, breadcrumb];

  if (catalog.offersPrivateEvents) {
    graph.push({
      "@type": "Offer",
      "@id": `${url}#events`,
      name:
        locale === "pt"
          ? "Eventos privados e festas"
          : "Private events and birthday parties",
      description: copy?.intro || description,
      url,
      category: "EventVenue",
      areaServed: "Lisbon",
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
}

export default async function LocationPage({ params }) {
  const { slug, locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const catalog = getRestaurantBySlug(slug);
  if (!catalog) notFound();

  const copy = getBranchCopy(slug, locale);

  let restaurant = null;
  let openingSlots = [];
  let menus = [];
  let websiteContentRaw = null;

  try {
    const data = await getRestaurant(catalog.id);
    restaurant = data?.restaurant ?? data?.data ?? null;
    openingSlots = data?.opening_hours?.opening_slots ?? [];
    const menusRaw = restaurant?.menus ?? data?.menus ?? [];
    menus = Array.isArray(menusRaw) ? menusRaw : menusRaw ? [menusRaw] : [];
    websiteContentRaw =
      data?.website_content ?? restaurant?.website_content ?? null;
  } catch {
    restaurant = null;
  }

  const aggregateRating = await loadPlaceRating(catalog.id);
  const pageContent = mergeWebsiteContent(catalog.id, websiteContentRaw);
  const featureImage = getFeatureImage(pageContent);
  const favorites = buildLocationFavorites(menus);
  const otherLocations = LOCATION_SLUGS.filter((s) => s !== slug).map((s) =>
    getRestaurantBySlug(s)
  );
  const path = locationPath(catalog, locale);
  const menuHref = menuPath(catalog, locale);
  const homeUrl = `${SITE_URL}/${locale}`;
  const jsonLd = buildJsonLd({
    catalog,
    restaurant,
    path,
    menuUrl: `${SITE_URL}${menuHref}`,
    homeUrl,
    featureImage,
    copy,
    openingSlots,
    aggregateRating,
    locale,
  });

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <LocationPageClient
        catalog={catalog}
        restaurant={restaurant}
        openingSlots={openingSlots}
        favorites={favorites}
        otherLocations={otherLocations}
        menuHref={menuHref}
        featureImage={featureImage}
        storyTitle={pageContent.storyTitle || ""}
        storyText={pageContent.storyText || ""}
        positioningHeadline={copy?.headline || ""}
        positioningIntro={copy?.intro || ""}
        venueLabelOverride={copy?.venueLabel || ""}
      />
    </>
  );
}
