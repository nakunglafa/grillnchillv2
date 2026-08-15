import { HomePageClient } from "@/components/HomePageClient";
import { getRestaurant } from "@/lib/api";
import { getBranchCopy } from "@/lib/branch-copy";
import { buildHrefLangAlternates, DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { getMessages, t } from "@/lib/messages";
import {
  CONFIGURED_RESTAURANTS,
  locationPath,
} from "@/lib/restaurants";
import {
  extractWebsiteContentFromPayload,
  getFeatureImage,
  mergeWebsiteContent,
  resolveMediaUrl,
} from "@/lib/website-content";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");
const BRAND =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
  "Grill N Chill";

const OG_LOCALE = {
  en: "en_GB",
  pt: "pt_PT",
  ne: "ne_NP",
  fr: "fr_FR",
  de: "de_DE",
  nl: "nl_NL",
  es: "es_ES",
};

/** Homepage SEO aimed at Nepali / Indian restaurant + Alameda / Arroios intents. */
const HOME_SEO = {
  en: {
    title: `Best Nepali & Indian Restaurant Lisbon | ${BRAND} Alameda Arroios`,
    description:
      "Top Nepali restaurant in Lisbon and favourite Indian restaurant near Alameda, Arroios and Praça do Chile. Grill N Chill — book a table, order takeaway, or find the best Nepali and Indian food near you in Lisbon.",
    keywords: [
      "best Nepali restaurant Lisbon",
      "top Nepali restaurant Lisbon",
      "Nepali restaurant near me",
      "best Indian restaurant Lisbon",
      "top Indian restaurant Lisbon",
      "Indian restaurant near me",
      "Nepali restaurant Alameda",
      "Indian restaurant Arroios",
      "Nepali restaurant Arroios",
      "Indian restaurant Alameda",
      "Nepali Indian restaurant Lisbon",
      "Grill N Chill Lisbon",
      "restaurant Praça do Chile",
      "restaurant Intendente Lisbon",
    ],
  },
  pt: {
    title: `Melhor Restaurante Nepalês e Indiano Lisboa | ${BRAND} Alameda Arroios`,
    description:
      "Um dos melhores restaurantes nepaleses em Lisboa e cozinha indiana perto de Alameda, Arroios e Praça do Chile. Grill N Chill — reserve mesa, peça takeaway ou encontre comida nepalesa e indiana perto de si.",
    keywords: [
      "melhor restaurante nepalês Lisboa",
      "restaurante nepalês Lisboa",
      "restaurante indiano Lisboa",
      "restaurante nepalês Alameda",
      "restaurante indiano Arroios",
      "comida nepalesa perto de mim",
      "comida indiana perto de mim",
      "Grill N Chill Lisboa",
    ],
  },
  ne: {
    title: `लिस्बनको उत्कृष्ट नेपाली र भारतीय रेस्टुरेन्ट | ${BRAND} आलामेदा अरोइओस`,
    description:
      "लिस्बनको उत्कृष्ट नेपाली रेस्टुरेन्ट र आलामेदा, अरोइओस तथा प्रासा दो चिले नजिकको भारतीय खाना। ग्रिल एन चिल — टेबल बुक गर्नुहोस्, टेकअवे अर्डर गर्नुहोस्, वा आफ्नो नजिकैको उत्कृष्ट नेपाली र भारतीय खाना खोज्नुहोस्।",
    keywords: [
      "उत्कृष्ट नेपाली रेस्टुरेन्ट लिस्बन",
      "नेपाली रेस्टुरेन्ट लिस्बन",
      "भारतीय रेस्टुरेन्ट लिस्बन",
      "नेपाली रेस्टुरेन्ट आलामेदा",
      "नेपाली रेस्टुरेन्ट अरोइओस",
      "मेरो नजिक नेपाली रेस्टुरेन्ट",
      "मेरो नजिक भारतीय रेस्टुरेन्ट",
      "Grill N Chill Lisbon",
    ],
  },
  fr: {
    title: `Meilleur restaurant népalais & indien Lisbonne | ${BRAND}`,
    description:
      "Restaurant népalais et indien près d’Alameda, Arroios et Praça do Chile à Lisbonne. Grill N Chill — réservez ou à emporter.",
    keywords: [
      "meilleur restaurant népalais Lisbonne",
      "restaurant indien Lisbonne",
      "restaurant népalais Alameda",
      "Grill N Chill Lisbonne",
    ],
  },
  de: {
    title: `Bestes nepalesisches & indisches Restaurant Lissabon | ${BRAND}`,
    description:
      "Top nepalesisches Restaurant in Lissabon und indisches Essen nahe Alameda, Arroios und Praça do Chile. Grill N Chill — reservieren oder Takeaway.",
    keywords: [
      "bestes nepalesisches Restaurant Lissabon",
      "indisches Restaurant Lissabon",
      "nepalesisches Restaurant Alameda",
      "Grill N Chill Lissabon",
    ],
  },
  nl: {
    title: `Beste Nepalese & Indiase restaurant Lissabon | ${BRAND}`,
    description:
      "Top Nepalees restaurant in Lissabon en Indiase keuken bij Alameda, Arroios en Praça do Chile. Grill N Chill — reserveer of haal af.",
    keywords: [
      "beste Nepalese restaurant Lissabon",
      "Indisch restaurant Lissabon",
      "Nepalees restaurant Alameda",
      "Grill N Chill Lissabon",
    ],
  },
  es: {
    title: `Mejor restaurante nepalí e indio Lisboa | ${BRAND}`,
    description:
      "Restaurante nepalí e indio cerca de Alameda, Arroios y Praça do Chile en Lisboa. Grill N Chill — reserva o para llevar.",
    keywords: [
      "mejor restaurante nepalí Lisboa",
      "restaurante indio Lisboa",
      "restaurante nepalí Alameda",
      "Grill N Chill Lisboa",
    ],
  },
};

async function loadHeroSlides(locale) {
  const rows = await Promise.all(
    CONFIGURED_RESTAURANTS.map(async (catalog) => {
      const branch = getBranchCopy(catalog.slug, locale);
      let name = catalog.label;
      let address = catalog.addressFallback || "";
      let phone = "";
      let featureImage = "";
      let logoUrl = "";

      try {
        const data = await getRestaurant(catalog.id);
        const restaurant = data?.restaurant ?? data?.data ?? null;
        name = restaurant?.name || name;
        address = restaurant?.address || address;
        phone = restaurant?.phone || "";
        logoUrl = resolveMediaUrl(
          restaurant?.logo_url || restaurant?.logoUrl || ""
        );
        const content = mergeWebsiteContent(
          catalog.id,
          extractWebsiteContentFromPayload(data)
        );
        featureImage = getFeatureImage(content, logoUrl);
      } catch {
        /* keep catalog fallbacks */
      }

      return {
        id: catalog.id,
        slug: catalog.slug,
        href: locationPath(catalog, locale),
        name,
        shortLabel: catalog.shortLabel,
        venueLabel: branch?.venueLabel || catalog.venueLabel || "",
        headline: branch?.headline || "",
        detail: branch?.intro || "",
        address,
        phone,
        image: featureImage || logoUrl || "",
      };
    })
  );
  return rows;
}

export async function generateMetadata({ params }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const messages = getMessages(locale);
  const seo = HOME_SEO[locale] || HOME_SEO.en;
  const fallbackDescription = t(
    messages,
    "home.supporting",
    seo.description
  );
  const path = `/${locale}`;
  return {
    title: seo.title,
    description: seo.description || fallbackDescription,
    keywords: seo.keywords,
    alternates: {
      canonical: path,
      languages: buildHrefLangAlternates(SITE_URL, "/"),
    },
    openGraph: {
      title: seo.title,
      description: seo.description,
      url: `${SITE_URL}${path}`,
      siteName: BRAND,
      locale: OG_LOCALE[locale] || "en_GB",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
  };
}

export default async function HomePage({ params }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const heroSlides = await loadHeroSlides(locale);
  return <HomePageClient heroSlides={heroSlides} />;
}
