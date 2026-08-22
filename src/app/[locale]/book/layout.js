import { getRestaurant } from "@/lib/api";
import {
  CONFIGURED_RESTAURANTS,
  getDefaultRestaurantId,
  locationPath,
} from "@/lib/restaurants";
import {
  buildHrefLangAlternates,
  DEFAULT_LOCALE,
  isLocale,
  localizedPath,
} from "@/lib/i18n";
import { JsonLd } from "@/components/JsonLd";
import { breadcrumbList, SITE_URL as SCHEMA_SITE } from "@/lib/json-ld";

const RESTAURANT_ID = String(getDefaultRestaurantId() ?? "2");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");
const BRAND =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
  "Grill N Chill";

export async function generateMetadata({ params }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const path = localizedPath(locale, "/book");
  try {
    const data = await getRestaurant(RESTAURANT_ID);
    const restaurant = data?.restaurant ?? data?.data ?? data;
    const name = restaurant?.name || BRAND;
    const title = `Reserve a Table | ${name}`;
    const description = `Book a table at ${name}. Easy online reservations for Grill N Chill in Lisbon.`;
    return {
      title,
      description,
      alternates: {
        canonical: path,
        languages: buildHrefLangAlternates(SITE_URL, "/book"),
      },
      openGraph: {
        title,
        description,
        url: `${SITE_URL}${path}`,
        siteName: BRAND,
        type: "website",
      },
    };
  } catch {
    return {
      title: `Reserve a Table | ${BRAND}`,
      description: `Book your table at Grill N Chill in Lisbon.`,
      alternates: {
        canonical: path,
        languages: buildHrefLangAlternates(SITE_URL, "/book"),
      },
    };
  }
}

export default async function BookLayout({ children, params }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const path = localizedPath(locale, "/book");
  const bookable = CONFIGURED_RESTAURANTS.filter(
    (r) => r.offersTableReservations !== false && r.venueType !== "bakery"
  );
  return (
    <>
      <JsonLd
        id="book-schema"
        data={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "ReserveAction",
              "@id": `${SCHEMA_SITE}${path}#reserve`,
              name: "Reserve a table",
              target: {
                "@type": "EntryPoint",
                urlTemplate: `${SCHEMA_SITE}${path}`,
                inLanguage: locale,
                actionPlatform: [
                  "https://schema.org/DesktopWebPlatform",
                  "https://schema.org/MobileWebPlatform",
                ],
              },
              object: bookable.map((r) => ({
                "@type": "Restaurant",
                "@id": `${SCHEMA_SITE}${locationPath(r, locale)}#venue`,
                name: r.label,
              })),
            },
            breadcrumbList([
              { name: "Home", item: `${SCHEMA_SITE}/${locale}` },
              { name: "Reserve a table", item: `${SCHEMA_SITE}${path}` },
            ]),
          ],
        }}
      />
      {children}
    </>
  );
}
