import { getRestaurant } from "@/lib/api";
import { getDefaultRestaurantId } from "@/lib/restaurants";

const RESTAURANT_ID = String(getDefaultRestaurantId() ?? "2");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");
const BRAND =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
  "Grill N Chill";

export async function generateMetadata() {
  try {
    const data = await getRestaurant(RESTAURANT_ID);
    const restaurant = data?.restaurant ?? data?.data ?? data;
    const name = restaurant?.name || BRAND;
    const title = `Menu | ${name}`;
    const description = `Browse the live menu at ${name}. Order online from Grill N Chill in Lisbon.`;
    return {
      title,
      description,
      alternates: { canonical: "/menu" },
      openGraph: {
        title,
        description,
        url: `${SITE_URL}/menu`,
        siteName: BRAND,
        type: "website",
      },
    };
  } catch {
    return {
      title: `Menu | ${BRAND}`,
      description: `Explore Grill N Chill menus across Lisbon.`,
    };
  }
}

export default function MenuLayout({ children }) {
  return children;
}
