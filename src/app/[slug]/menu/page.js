import { notFound } from "next/navigation";
import { getRestaurantBySlug, LOCATION_SLUGS, menuPath, locationPath } from "@/lib/restaurants";
import { getRestaurant } from "@/lib/api";
import { LocationMenuClient } from "@/components/LocationMenuClient";

export function generateStaticParams() {
  return LOCATION_SLUGS.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const catalog = getRestaurantBySlug(slug);
  if (!catalog) return { title: "Menu" };

  try {
    const data = await getRestaurant(catalog.id);
    const api = data?.restaurant ?? data?.data ?? data;
    const name = api?.name || catalog.label;
    return {
      title: `Menu | ${name}`,
      description: `Browse the live menu at ${name}. Order online from Grill N Chill.`,
      alternates: { canonical: menuPath(catalog) },
    };
  } catch {
    return {
      title: `Menu | ${catalog.label}`,
      alternates: { canonical: menuPath(catalog) },
    };
  }
}

export default async function LocationMenuPage({ params }) {
  const { slug } = await params;
  const catalog = getRestaurantBySlug(slug);
  if (!catalog) notFound();

  let restaurant = null;
  let menus = [];
  let specialMenuLists = [];
  let error = "";

  try {
    const data = await getRestaurant(catalog.id);
    restaurant = data?.restaurant ?? data?.data ?? null;
    const menusRaw = restaurant?.menus ?? data?.menus ?? [];
    menus = Array.isArray(menusRaw) ? menusRaw : menusRaw ? [menusRaw] : [];
    const specialRaw = restaurant?.special_menu_lists ?? data?.special_menu_lists ?? [];
    specialMenuLists = Array.isArray(specialRaw) ? specialRaw : specialRaw ? [specialRaw] : [];
  } catch (err) {
    error = err?.message || "Failed to load menu";
  }

  return (
    <LocationMenuClient
      catalog={catalog}
      restaurant={restaurant}
      menus={menus}
      specialMenuLists={specialMenuLists}
      error={error}
      backHref={locationPath(catalog)}
    />
  );
}
