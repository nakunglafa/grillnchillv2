/** @returns {import("next").MetadataRoute.Manifest} */
export default function manifest() {
  const shortName = process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() || "Grill N Chill";
  return {
    id: "/",
    name: `${shortName} — order, book & owner tools`,
    short_name: shortName,
    description:
      "Order food, book a table, and manage your venues. Install for quick access and reliable alerts on your phone.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "portrait-primary",
    background_color: "#241e19",
    theme_color: "#241e19",
    categories: ["food", "business"],
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Menu",
        short_name: "Menu",
        description: "Browse the menu",
        url: "/menu",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Book a table",
        short_name: "Book",
        description: "Table reservations",
        url: "/book",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "My orders",
        short_name: "Orders",
        description: "Track takeaway and orders",
        url: "/orders",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Owner dashboard",
        short_name: "Owner",
        description: "Staff dashboard and live updates",
        url: "/owner/dashboard",
        icons: [{ src: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
