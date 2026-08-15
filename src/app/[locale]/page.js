import { HomePageClient } from "@/components/HomePageClient";
import { buildHrefLangAlternates, DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { getMessages, t } from "@/lib/messages";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");
const BRAND =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
  "Grill N Chill";

const OG_LOCALE = {
  en: "en_GB",
  pt: "pt_PT",
  fr: "fr_FR",
  de: "de_DE",
  nl: "nl_NL",
  es: "es_ES",
};

export async function generateMetadata({ params }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const messages = getMessages(locale);
  const description = t(
    messages,
    "home.supporting",
    "Two Lisbon restaurants for lunch and dinner, plus a bakery café."
  );
  const path = `/${locale}`;
  return {
    title: `${BRAND} | Lisbon restaurants & bakery`,
    description,
    alternates: {
      canonical: path,
      languages: buildHrefLangAlternates(SITE_URL, "/"),
    },
    openGraph: {
      title: BRAND,
      description,
      url: `${SITE_URL}${path}`,
      siteName: BRAND,
      locale: OG_LOCALE[locale] || "en_GB",
      type: "website",
    },
  };
}

export default function HomePage() {
  return <HomePageClient />;
}
