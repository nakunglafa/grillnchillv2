import { getRestaurant } from "@/lib/api";

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || "1";

export async function generateMetadata() {
  try {
    const data = await getRestaurant(RESTAURANT_ID);
    const restaurant = data?.restaurant ?? data?.data ?? data;

    const name = restaurant?.name || "Thai Maki";
    const address = restaurant?.address || "Almancil, Algarve";
    const phone = restaurant?.phone || "+351 920 311 793";

    const title =
      "Reserve a Table | Thai and Sushi Restaurant in Almancil, Faro, Algarve";

    const description =
      `Reserve a sua mesa em ${name}, ${address}. ` +
      "Enjoy Thai and sushi dining with easy online booking for lunch and dinner in Almancil near Faro, Algarve. Great choice for people searching Thai or sushi restaurant near me. Contact us at " +
      phone +
      " or reserve online.";

    return {
      title,
      description,
      alternates: {
        canonical: "/book",
      },
      openGraph: {
        title,
        description,
        url: "/book",
        type: "website",
        siteName: "Thai Maki",
      },
      robots: {
        index: true,
        follow: true,
      },
    };
  } catch {
    const fallbackTitle = "Reserve a Table | Thai Restaurant in Almancil, Faro, Algarve";
    const fallbackDescription =
      "Book your table at Thai Maki, a Thai and sushi restaurant in Almancil near Faro, Algarve.";

    return {
      title: fallbackTitle,
      description: fallbackDescription,
      alternates: {
        canonical: "/book",
      },
    };
  }
}

export default function BookLayout({ children }) {
  return children;
}

