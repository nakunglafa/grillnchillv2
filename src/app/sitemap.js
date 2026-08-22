import { CONFIGURED_RESTAURANTS, locationPath, menuPath, cakeOrderPath } from "@/lib/restaurants";
import { LOCALES, localizedPath } from "@/lib/i18n";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(
  /\/$/,
  ""
);

/** @returns {import("next").MetadataRoute.Sitemap} */
export default function sitemap() {
  const now = new Date();
  /** @type {import("next").MetadataRoute.Sitemap} */
  const entries = [];

  for (const locale of LOCALES) {
    entries.push({
      url: `${SITE_URL}${localizedPath(locale, "/")}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    });
    entries.push({
      url: `${SITE_URL}${localizedPath(locale, "/book")}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    });
    entries.push({
      url: `${SITE_URL}${localizedPath(locale, "/privacy")}`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    });

    for (const r of CONFIGURED_RESTAURANTS) {
      entries.push({
        url: `${SITE_URL}${locationPath(r, locale)}`,
        lastModified: now,
        changeFrequency: "weekly",
        priority: 0.95,
      });
      entries.push({
        url: `${SITE_URL}${menuPath(r, locale)}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.9,
      });
      if (r.venueType === "bakery") {
        entries.push({
          url: `${SITE_URL}${cakeOrderPath(r, locale)}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.92,
        });
      }
    }
  }

  return entries;
}
