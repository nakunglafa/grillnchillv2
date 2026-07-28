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
    const title = `Reserve a Table | ${name}`;
    const description = `Book a table at ${name}. Easy online reservations for Grill N Chill in Lisbon.`;
    return {
      title,
      description,
      alternates: { canonical: "/book" },
      openGraph: {
        title,
        description,
        url: `${SITE_URL}/book`,
        siteName: BRAND,
        type: "website",
      },
    };
  } catch {
    return {
      title: `Reserve a Table | ${BRAND}`,
      description: `Book your table at Grill N Chill in Lisbon.`,
    };
  }
}

export default function BookLayout({ children }) {
  return children;
}
