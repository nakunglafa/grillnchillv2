export default function sitemap() {
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://restaurant.digitallisbon.pt").replace(/\/$/, "");

  const routes = [
    { path: "/", priority: 1.0, changeFrequency: "daily" },
    { path: "/menu", priority: 0.9, changeFrequency: "daily" },
    { path: "/book", priority: 0.9, changeFrequency: "weekly" },
  ];

  const lastModified = new Date();

  return routes.map((route) => ({
    url: `${baseUrl}${route.path}`,
    lastModified,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}

