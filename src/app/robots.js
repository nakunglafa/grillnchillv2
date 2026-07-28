const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(
  /\/$/,
  ""
);

/** @returns {import("next").MetadataRoute.Robots} */
export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/owner/",
          "/api/",
          "/login",
          "/register",
          "/profile",
          "/orders",
          "/checkout",
          "/reservations",
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
