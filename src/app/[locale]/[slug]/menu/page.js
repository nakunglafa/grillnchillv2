import { notFound } from "next/navigation";
import {
  getRestaurantBySlug,
  LOCATION_SLUGS,
  menuPath,
  locationPath,
} from "@/lib/restaurants";
import { getRestaurant } from "@/lib/api";
import { LocationMenuClient } from "@/components/LocationMenuClient";
import {
  extractWebsiteContentFromPayload,
  getFeatureImage,
  mergeWebsiteContent,
  resolveMediaUrl,
} from "@/lib/website-content";
import { buildHrefLangAlternates, DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { getBranchCopy } from "@/lib/branch-copy";
import { JsonLd } from "@/components/JsonLd";
import { buildMenuJsonLd } from "@/lib/json-ld";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");
const BRAND =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
  "Grill N Chill";

function absUrl(pathOrUrl) {
  if (!pathOrUrl) return undefined;
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  return `${SITE_URL}${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;
}

export function generateStaticParams() {
  return LOCATION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug, locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const catalog = getRestaurantBySlug(slug);
  if (!catalog) return { title: "Menu" };

  const copy = getBranchCopy(slug, locale);
  const barePath = menuPath(catalog);
  const path = menuPath(catalog, locale);
  const canonical = `${SITE_URL}${path}`;

  try {
    const data = await getRestaurant(catalog.id);
    const api = data?.restaurant ?? data?.data ?? data;
    const name = api?.name || catalog.label;
    const title = `Menu — ${name}`;
    const description =
      copy?.seoDescription ||
      `Browse the live menu at ${name}. Order takeaway online from Grill N Chill in Lisbon.`;
    const content = mergeWebsiteContent(
      catalog.id,
      extractWebsiteContentFromPayload(data)
    );
    const image = absUrl(
      getFeatureImage(content) ||
        resolveMediaUrl(api?.logo_url || api?.logoUrl) ||
        undefined
    );

    return {
      title,
      description,
      alternates: {
        canonical: path,
        languages: buildHrefLangAlternates(SITE_URL, barePath),
      },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: BRAND,
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
    const title = `Menu — ${catalog.label}`;
    const description = `Browse the menu at ${catalog.label}. Order takeaway online from Grill N Chill.`;
    return {
      title,
      description,
      alternates: {
        canonical: path,
        languages: buildHrefLangAlternates(SITE_URL, barePath),
      },
      openGraph: {
        title,
        description,
        url: canonical,
        siteName: BRAND,
        type: "website",
      },
      twitter: { card: "summary", title, description },
    };
  }
}

export default async function LocationMenuPage({ params }) {
  const { slug, locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const catalog = getRestaurantBySlug(slug);
  if (!catalog) notFound();

  let restaurant = null;
  let menus = [];
  let specialMenuLists = [];
  let error = "";

  try {
    const data = await getRestaurant(catalog.id);
    restaurant = data?.restaurant ?? data?.data ?? null;
    const menusRaw = restaurant?.menus ?? data?.menus ?? [];
    menus = Array.isArray(menusRaw) ? menusRaw : menusRaw ? [menusRaw] : [];
    const specialRaw = restaurant?.special_menu_lists ?? data?.special_menu_lists ?? [];
    specialMenuLists = Array.isArray(specialRaw) ? specialRaw : specialRaw ? [specialRaw] : [];
  } catch (err) {
    error = err?.message || "Failed to load menu";
  }

  return (
    <>
      <JsonLd
        id="menu-schema"
        data={buildMenuJsonLd({
          catalog,
          restaurant,
          menus,
          locale,
          path: menuPath(catalog, locale),
          locationUrl: `${SITE_URL}${locationPath(catalog, locale)}`,
        })}
      />
      <LocationMenuClient
        catalog={catalog}
        restaurant={restaurant}
        menus={menus}
        specialMenuLists={specialMenuLists}
        error={error}
        backHref={locationPath(catalog, locale)}
      />
    </>
  );
}
