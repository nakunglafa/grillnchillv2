import { notFound } from "next/navigation";
import {
  getRestaurantBySlug,
  LOCATION_SLUGS,
  locationPath,
  menuPath,
} from "@/lib/restaurants";
import { getRestaurant } from "@/lib/api";
import { buildLocationFavorites } from "@/lib/location-favorites";
import { LocationPageClient } from "@/components/LocationPageClient";
import {
  getFeatureImage,
  mergeWebsiteContent,
} from "@/lib/website-content";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");

export function generateStaticParams() {
  return LOCATION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const catalog = getRestaurantBySlug(slug);
  if (!catalog) return { title: "Location" };

  const path = locationPath(catalog);
  const canonical = `${SITE_URL}${path}`;

  try {
    const data = await getRestaurant(catalog.id);
    const api = data?.restaurant ?? data?.data ?? data;
    const name = api?.name || catalog.label;
    const description =
      catalog.seoDescription ||
      (api?.address
        ? `${name} — ${api.address}. Menu, orders and table booking.`
        : `${name} — Grill N Chill Lisbon.`);
    const content = mergeWebsiteContent(
      catalog.id,
      data?.website_content ?? api?.website_content ?? null
    );
    const image =
      getFeatureImage(content) || api?.logo_url || api?.logoUrl || undefined;

    return {
      title: name,
      description,
      keywords: [...(catalog.areaServed || []), "Grill N Chill", "Lisbon", catalog.venueLabel].filter(
        Boolean
      ),
      alternates: { canonical: path },
      openGraph: {
        title: name,
        description,
        url: canonical,
        type: "website",
        images: image ? [{ url: image }] : undefined,
      },
      twitter: {
        card: "summary_large_image",
        title: name,
        description,
      },
    };
  } catch {
    return {
      title: catalog.label,
      description: catalog.seoDescription || `${catalog.label} — Grill N Chill Lisbon.`,
      alternates: { canonical: path },
    };
  }
}

function buildJsonLd({ catalog, restaurant, path, featureImage }) {
  const name = restaurant?.name || catalog.label;
  const schemaType =
    catalog.venueType === "bakery" ? "Bakery" : "Restaurant";
  const url = `${SITE_URL}${path}`;

  const localBusiness = {
    "@context": "https://schema.org",
    "@type": schemaType,
    name,
    url,
    description: catalog.seoDescription,
    telephone: restaurant?.phone || undefined,
    email: restaurant?.email || undefined,
    image:
      featureImage || restaurant?.logo_url || restaurant?.logoUrl || undefined,
    address: restaurant?.address
      ? {
          "@type": "PostalAddress",
          streetAddress: restaurant.address,
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
        ? ["Bakery", "Café"]
        : ["Grill", "Portuguese", "International"],
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: catalog.shortLabel || name,
        item: url,
      },
    ],
  };

  return [localBusiness, breadcrumb];
}

export default async function LocationPage({ params }) {
  const { slug } = await params;
  const catalog = getRestaurantBySlug(slug);
  if (!catalog) notFound();

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

  const pageContent = mergeWebsiteContent(catalog.id, websiteContentRaw);
  const featureImage = getFeatureImage(pageContent);
  const favorites = buildLocationFavorites(menus);
  const otherLocations = LOCATION_SLUGS.filter((s) => s !== slug).map((s) =>
    getRestaurantBySlug(s)
  );
  const path = locationPath(catalog);
  const jsonLd = buildJsonLd({ catalog, restaurant, path, featureImage });

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
        menuHref={menuPath(catalog)}
        featureImage={featureImage}
        storyTitle={pageContent.storyTitle || ""}
        storyText={pageContent.storyText || ""}
      />
    </>
  );
}
