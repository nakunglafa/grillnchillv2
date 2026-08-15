import { LOCALES } from "@/lib/i18n";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(
  /\/$/,
  ""
);

const PRIVATE_SUFFIXES = [
  "/login",
  "/register",
  "/profile",
  "/orders",
  "/checkout",
  "/reservations",
];

/** @returns {import("next").MetadataRoute.Robots} */
export default function robots() {
  const disallow = ["/owner/", "/api/"];
  for (const locale of LOCALES) {
    for (const suffix of PRIVATE_SUFFIXES) {
      disallow.push(`/${locale}${suffix}`);
    }
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
