import { CONFIGURED_RESTAURANTS, locationPath } from "@/lib/restaurants";

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(
  /\/$/,
  ""
);
export const BRAND_NAME =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
  "Grill N Chill";

export const ORGANIZATION_ID = `${SITE_URL}/#organization`;
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** @param {string | null | undefined} address */
export function postalAddressFromString(address) {
  const raw = String(address || "").trim();
  if (!raw) return undefined;
  const postal = raw.match(/\b\d{4}-\d{3}\b/);
  return {
    "@type": "PostalAddress",
    streetAddress: raw,
    addressLocality: "Lisbon",
    postalCode: postal ? postal[0] : undefined,
    addressCountry: "PT",
  };
}

/** @param {{ name: string, item: string }[]} items */
export function breadcrumbList(items) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.name,
      item: it.item,
    })),
  };
}

/**
 * @param {{
 *   locale?: string,
 *   schemaImage?: string | null,
 *   socialLinks?: { instagram?: string | null, facebook?: string | null, x?: string | null, tripadvisor?: string | null },
 *   description?: string,
 * }} [opts]
 */
export function buildOrganizationNode({
  locale = "en",
  schemaImage,
  socialLinks,
  description,
} = {}) {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: BRAND_NAME,
    url: SITE_URL,
    description,
    logo: schemaImage || undefined,
    image: schemaImage || undefined,
    knowsAbout: [
      "Nepali cuisine",
      "Indian cuisine",
      "Portuguese cuisine",
      "Best Nepali restaurant Lisbon",
      "Indian restaurant Lisbon",
    ],
    areaServed: [
      { "@type": "City", name: "Lisbon" },
      { "@type": "Place", name: "Alameda" },
      { "@type": "Place", name: "Arroios" },
      { "@type": "Place", name: "Praça do Chile" },
      { "@type": "Place", name: "Intendente" },
    ],
    sameAs: [
      socialLinks?.instagram,
      socialLinks?.facebook,
      socialLinks?.x,
      socialLinks?.tripadvisor,
    ].filter(Boolean),
    department: CONFIGURED_RESTAURANTS.map((r) => ({
      "@type": r.venueType === "bakery" ? "Bakery" : "Restaurant",
      "@id": `${SITE_URL}${locationPath(r, locale)}#venue`,
      name: r.label,
      url: `${SITE_URL}${locationPath(r, locale)}`,
    })),
  };
}

/** @param {string} [locale] */
export function buildWebsiteNode(locale = "en") {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: `${SITE_URL}/${locale}`,
    name: BRAND_NAME,
    inLanguage: locale,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/**
 * @param {string} locale
 * @param {{ name?: string, slug?: string, label?: string }[]} [rows]
 */
export function buildHomeItemList(locale, rows = CONFIGURED_RESTAURANTS) {
  const list = Array.isArray(rows) ? rows : [];
  return {
    "@type": "ItemList",
    name: `${BRAND_NAME} locations in Lisbon`,
    numberOfItems: list.length,
    itemListElement: list.map((r, i) => {
      const catalog = CONFIGURED_RESTAURANTS.find((c) => c.slug === r.slug) || r;
      const url = `${SITE_URL}${locationPath(catalog, locale)}`;
      return {
        "@type": "ListItem",
        position: i + 1,
        name: r.name || r.label || catalog.label,
        url,
        item: { "@id": `${url}#venue` },
      };
    }),
  };
}

/**
 * Menu schema with a capped item list so HTML stays small.
 * @param {{
 *   catalog: { label?: string, shortLabel?: string, slug?: string },
 *   restaurant?: { name?: string } | null,
 *   menus?: unknown[],
 *   locale: string,
 *   path: string,
 *   locationUrl: string,
 * }} opts
 */
export function buildMenuJsonLd({
  catalog,
  restaurant,
  menus,
  locale,
  path,
  locationUrl,
}) {
  const MAX_ITEMS = 40;
  const sections = [];
  let count = 0;

  const walk = (categories) => {
    for (const cat of Array.isArray(categories) ? categories : []) {
      if (count >= MAX_ITEMS) return;
      const rawItems = Array.isArray(cat.items)
        ? cat.items.filter((i) => i && i.is_available !== false)
        : [];
      const hasMenuItem = [];
      for (const item of rawItems) {
        if (count >= MAX_ITEMS) break;
        const price = item.price != null && item.price !== "" ? Number(item.price) : NaN;
        hasMenuItem.push({
          "@type": "MenuItem",
          name: item.name,
          description: item.description || item.short_description || undefined,
          offers: Number.isFinite(price)
            ? { "@type": "Offer", price: String(price), priceCurrency: "EUR" }
            : undefined,
        });
        count += 1;
      }
      if (hasMenuItem.length) {
        sections.push({
          "@type": "MenuSection",
          name: cat.name,
          hasMenuItem,
        });
      }
      const children = cat.children || cat.child_categories || [];
      if (children.length) walk(children);
    }
  };

  for (const menu of menus || []) {
    walk(menu?.categories);
  }

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Menu",
        "@id": `${SITE_URL}${path}#menu`,
        name: `Menu — ${restaurant?.name || catalog.label}`,
        url: `${SITE_URL}${path}`,
        hasMenuSection: sections.length ? sections : undefined,
        mainEntityOfPage: `${SITE_URL}${path}`,
        isPartOf: { "@id": `${locationUrl}#venue` },
      },
      breadcrumbList([
        { name: "Home", item: `${SITE_URL}/${locale}` },
        { name: catalog.shortLabel || catalog.label, item: locationUrl },
        { name: "Menu", item: `${SITE_URL}${path}` },
      ]),
    ],
  };
}

/**
 * Custom cake order page — Products + OrderAction linked to the bakery venue.
 * @param {{
 *   catalog: { label?: string, shortLabel?: string, slug?: string },
 *   restaurantName?: string,
 *   cakes?: Array<{
 *     id: number,
 *     name: string,
 *     imageUrl?: string,
 *     fromPrice?: number,
 *     variants?: Array<{ typeName?: string, price?: number }>,
 *   }>,
 *   locale: string,
 *   path: string,
 *   locationUrl: string,
 *   description?: string,
 * }} opts
 */
export function buildCakeOrderJsonLd({
  catalog,
  restaurantName,
  cakes,
  locale,
  path,
  locationUrl,
  description,
}) {
  const pageUrl = `${SITE_URL}${path}`;
  const products = (Array.isArray(cakes) ? cakes : []).slice(0, 24).map((cake) => {
    const variantOffers = (cake.variants || [])
      .filter((v) => Number(v.price) > 0)
      .slice(0, 8)
      .map((v) => ({
        "@type": "Offer",
        name: v.typeName || undefined,
        price: String(v.price),
        priceCurrency: "EUR",
        availability: "https://schema.org/InStock",
        url: pageUrl,
      }));
    const low = cake.fromPrice != null ? String(cake.fromPrice) : variantOffers[0]?.price;
    const offers =
      variantOffers.length > 1
        ? {
            "@type": "AggregateOffer",
            lowPrice: low,
            priceCurrency: "EUR",
            offerCount: variantOffers.length,
            availability: "https://schema.org/InStock",
            url: pageUrl,
            offers: variantOffers,
          }
        : variantOffers[0] ||
          (low
            ? {
                "@type": "Offer",
                price: low,
                priceCurrency: "EUR",
                availability: "https://schema.org/InStock",
                url: pageUrl,
              }
            : undefined);

    return {
      "@type": "Product",
      "@id": `${pageUrl}#cake-${cake.id}`,
      name: cake.name,
      image: cake.imageUrl || undefined,
      category: "Cake",
      brand: { "@type": "Brand", name: BRAND_NAME },
      offers,
    };
  });

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OrderAction",
        "@id": `${pageUrl}#order`,
        name: "Order a custom cake",
        description,
        target: {
          "@type": "EntryPoint",
          urlTemplate: pageUrl,
          inLanguage: locale,
          actionPlatform: [
            "https://schema.org/DesktopWebPlatform",
            "https://schema.org/MobileWebPlatform",
          ],
        },
        object: { "@id": `${locationUrl}#venue` },
        deliveryMethod: "https://schema.org/OnSitePickup",
      },
      {
        "@type": "ItemList",
        "@id": `${pageUrl}#cakes`,
        name: `Custom cakes — ${restaurantName || catalog.label}`,
        numberOfItems: products.length,
        itemListElement: products.map((item, i) => ({
          "@type": "ListItem",
          position: i + 1,
          item,
        })),
      },
      breadcrumbList([
        { name: "Home", item: `${SITE_URL}/${locale}` },
        { name: catalog.shortLabel || catalog.label, item: locationUrl },
        { name: "Order cake", item: pageUrl },
      ]),
    ],
  };
}
