import { notFound } from "next/navigation";
import {
  getRestaurantBySlug,
  cakeOrderPath,
  locationPath,
} from "@/lib/restaurants";
import { getRestaurant } from "@/lib/api";
import { CakeOrderClient } from "@/components/CakeOrderClient";
import { extractBakeryCakes } from "@/lib/cake-order";
import { getBranchCopy } from "@/lib/branch-copy";
import { buildHrefLangAlternates, DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { JsonLd } from "@/components/JsonLd";
import { buildCakeOrderJsonLd } from "@/lib/json-ld";

/** Live restaurant/menu API uses cache: "no-store" — must not be SSG. */
export const dynamic = "force-dynamic";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");
const BRAND =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
  "Grill N Chill";

const ORDER_CAKE_SEO = {
  en: {
    title: "Order Custom Cake Lisbon | Alameda & Arroios Pickup",
    description:
      "Order a custom cake for pickup near Alameda, Arroios and Praça do Chile. Choose flavour and size at The Bakery by Grill N Chill — birthday cakes and celebration cakes in Lisbon.",
  },
  pt: {
    title: "Encomendar Bolo Personalizado Lisboa | Alameda e Arroios",
    description:
      "Encomende um bolo personalizado para levantamento perto de Alameda, Arroios e Praça do Chile. Escolha sabor e tamanho na The Bakery by Grill N Chill — bolos de aniversário em Lisboa.",
  },
  ne: {
    title: "कस्टम केक अर्डर लिस्बन | आलामेदा र अरोइओस पिकअप",
    description:
      "आलामेदा, अरोइओस र प्रासा दो चिले नजिक पिकअपका लागि कस्टम केक अर्डर गर्नुहोस्। The Bakery by Grill N Chill मा स्वाद र साइज छान्नुहोस् — लिस्बनका जन्मदिन र उत्सवका केक।",
  },
  fr: {
    title: "Commander un gâteau personnalisé Lisbonne | Alameda & Arroios",
    description:
      "Commandez un gâteau personnalisé à emporter près d’Alameda, Arroios et Praça do Chile. Choisissez saveur et taille à The Bakery by Grill N Chill.",
  },
  de: {
    title: "Wunschkuchen Lissabon bestellen | Abholung Alameda & Arroios",
    description:
      "Bestellen Sie einen Wunschkuchen zur Abholung nahe Alameda, Arroios und Praça do Chile. Geschmack und Größe bei The Bakery by Grill N Chill wählen.",
  },
  nl: {
    title: "Taart op maat bestellen Lissabon | Afhalen Alameda & Arroios",
    description:
      "Bestel een taart op maat voor afhalen bij Alameda, Arroios en Praça do Chile. Kies smaak en formaat bij The Bakery by Grill N Chill.",
  },
  es: {
    title: "Encargar pastel personalizado Lisboa | Recogida Alameda y Arroios",
    description:
      "Encarga un pastel personalizado para recoger cerca de Alameda, Arroios y Praça do Chile. Elige sabor y tamaño en The Bakery by Grill N Chill.",
  },
};

export async function generateMetadata({ params }) {
  const { slug, locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const catalog = getRestaurantBySlug(slug);
  if (!catalog || catalog.venueType !== "bakery") {
    return { title: "Order cake" };
  }

  const copy = getBranchCopy(slug, locale);
  const barePath = cakeOrderPath(catalog);
  const path = cakeOrderPath(catalog, locale);
  const pageSeo = ORDER_CAKE_SEO[locale] || ORDER_CAKE_SEO.en;
  const title = pageSeo.title;
  const description = pageSeo.description;
  const keywords = [
    ...(copy?.keywords || []),
    "order custom cake Lisbon",
    "custom cake pickup Alameda",
    "custom cake Arroios",
    "encomendar bolo Lisboa",
  ];

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: path,
      languages: buildHrefLangAlternates(SITE_URL, barePath),
    },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}${path}`,
      siteName: BRAND,
      type: "website",
      locale: locale === "pt" ? "pt_PT" : locale,
    },
  };
}

export default async function OrderCakePage({ params }) {
  const { slug, locale: rawLocale } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const catalog = getRestaurantBySlug(slug);
  if (!catalog || catalog.venueType !== "bakery") {
    notFound();
  }

  const pageSeo = ORDER_CAKE_SEO[locale] || ORDER_CAKE_SEO.en;
  const path = cakeOrderPath(catalog, locale);
  let restaurantName = catalog.label;
  let cakes = [];
  try {
    const data = await getRestaurant(catalog.id);
    const api = data?.restaurant ?? data?.data ?? data;
    if (api?.name) restaurantName = api.name;
    const menusRaw = api?.menus ?? data?.menus ?? [];
    const menus = Array.isArray(menusRaw) ? menusRaw : menusRaw ? [menusRaw] : [];
    cakes = extractBakeryCakes(menus);
  } catch {
    /* use catalog label / empty cakes */
  }

  return (
    <>
      <JsonLd
        id="cake-order-schema"
        data={buildCakeOrderJsonLd({
          catalog,
          restaurantName,
          cakes,
          locale,
          path,
          locationUrl: `${SITE_URL}${locationPath(catalog, locale)}`,
          description: pageSeo.description,
        })}
      />
      <CakeOrderClient catalog={catalog} restaurantName={restaurantName} cakes={cakes} />
    </>
  );
}
