import { getRestaurant } from "@/lib/api";
import { toArray } from "@/lib/owner-utils";

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || "1";

function collectMenuItemNames(menusRaw) {
  const menus = Array.isArray(menusRaw) ? menusRaw : toArray(menusRaw || []);
  const names = new Set();

  const walkCategories = (categoriesRaw) => {
    const categories = Array.isArray(categoriesRaw) ? categoriesRaw : toArray(categoriesRaw || []);
    categories.forEach((cat) => {
      const items = Array.isArray(cat.items) ? cat.items : toArray(cat.items || []);
      items.forEach((item) => {
        if (item?.name) names.add(item.name);
      });
      if (cat.children) {
        walkCategories(cat.children);
      }
    });
  };

  menus.forEach((menu) => {
    if (menu?.categories) {
      walkCategories(menu.categories);
    }
  });

  return Array.from(names);
}

export async function generateMetadata() {
  try {
    const data = await getRestaurant(RESTAURANT_ID);
    const restaurant = data?.restaurant ?? data?.data ?? data;

    const name = restaurant?.name || "Thai Maki";
    const address = restaurant?.address || "Almancil, Algarve";
    const phone = restaurant?.phone || "+351 920 311 793";
    const logoUrl =
      restaurant?.logo_url ||
      "https://thainmaki.pt/cover.jpg";

    const menuItemNames =
      collectMenuItemNames(restaurant?.menus ?? data?.menus ?? []) || [];

    const highlightedItems = menuItemNames.slice(0, 10).join(", ");

    const title =
      "Menu Thai Maki | Thai and Sushi Restaurant in Almancil, Faro, Algarve";

    const description =
      `Explore o menu completo de ${name} em ${address}: ` +
      (highlightedItems
        ? `${highlightedItems}. `
        : "") +
      "Explore sushi rolls, sashimi, Thai curries, noodles, starters, desserts and drinks from our live menu. Perfect for people searching Thai or sushi restaurant near me in Faro, Almancil and Algarve.";

    return {
      title,
      description,
      alternates: {
        canonical: "/menu",
      },
      openGraph: {
        title,
        description,
        url: "/menu",
        type: "website",
        siteName: "Thai Maki",
        images: [
          {
            url: logoUrl,
            width: 800,
            height: 800,
            alt: name,
          },
        ],
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        images: [logoUrl],
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
        },
      },
    };
  } catch {
    const fallbackTitle =
      "Menu Thai Maki | Thai and Sushi Restaurant in Faro, Almancil, Algarve";
    const fallbackDescription =
      "Discover Thai Maki menu in Almancil near Faro with Thai specialties and sushi favorites.";

    return {
      title: fallbackTitle,
      description: fallbackDescription,
      alternates: {
        canonical: "/menu",
      },
    };
  }
}

export default function MenuLayout({ children }) {
  return children;
}

