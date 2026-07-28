import { CONFIGURED_RESTAURANTS, locationPath, menuPath } from "@/lib/restaurants";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(
  /\/$/,
  ""
);

/** @returns {import("next").MetadataRoute.Sitemap} */
export default function sitemap() {
  const now = new Date();
  const entries = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${SITE_URL}/book`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  for (const r of CONFIGURED_RESTAURANTS) {
    entries.push({
      url: `${SITE_URL}${locationPath(r)}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.95,
    });
    entries.push({
      url: `${SITE_URL}${menuPath(r)}`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    });
  }

  return entries;
}
