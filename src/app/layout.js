import { cookies, headers } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { OwnerAwareSiteChrome } from "@/components/OwnerAwareSiteChrome";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { CookieConsentGate } from "@/components/CookieConsentGate";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { getRestaurant } from "@/lib/api";
import {
  CONFIGURED_RESTAURANTS,
  getDefaultRestaurantId,
  locationPath,
} from "@/lib/restaurants";
import {
  getDefaultShareImage,
  mergeWebsiteContent,
  pickShareImage,
} from "@/lib/website-content";
import { publicThemeToCssVars, resolvePublicTheme } from "@/lib/site-theme";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import Script from "next/script";
import { Montserrat, Playfair_Display } from "next/font/google";

// Max time we wait for the backend before declaring it unreachable and showing
// the "site unavailable" page. Long enough to absorb a slow cold start, short
// enough that a fully-down server doesn't make the user stare at a blank tab.
const SERVER_PROBE_TIMEOUT_MS = 6000;

/**
 * Returns true when the error from getRestaurant() indicates the backend is
 * genuinely unreachable (network failure, timeout, or a 5xx response), as
 * opposed to a known 4xx (e.g. 404 restaurant not found, which is a config
 * issue we still want to render the site through).
 */
function isServerUnreachable(err) {
  if (!err) return false;
  // apiFetch attaches `status` on HTTP errors. Network failures throw before
  // we ever get a Response, so `status` is undefined for those.
  const status = err?.status;
  if (typeof status === "number") {
    return status >= 500;
  }
  // No status → fetch itself failed. This covers ECONNREFUSED, DNS errors,
  // TLS errors, and AbortError from our timeout below.
  return true;
}

const RESTAURANT_ID = String(getDefaultRestaurantId() ?? "2");
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://grillnchill.pt").replace(/\/$/, "");
const BRAND_NAME =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
  "Grill N Chill";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteTitle = `${BRAND_NAME} | Restaurants in Lisbon`;
const siteDescription =
  "Grill N Chill — Nepali, Portuguese and Indian cuisine across Lisbon. Order online, browse menus, and book a table at Praça do Chile, Intendente, or our bakery café.";
const siteKeywords = [
  "Grill N Chill",
  "Grill N Chill Lisbon",
  "restaurant Praça do Chile",
  "restaurant Intendente",
  "bakery Lisbon",
  "cake Lisbon",
  "custom cake Lisbon",
  "cake Alameda Lisbon",
  "cakes Arroios",
  "bolos Lisboa",
  "bolo personalizado Lisboa",
  "Nepali restaurant Lisbon",
  "Portuguese cuisine Lisbon",
  "Indian restaurant Lisbon",
  "book restaurant table Lisbon",
  "restaurant menu Lisbon",
];

function buildSiteMetadata(shareImageUrl) {
  const ogImages = shareImageUrl
    ? [
        {
          url: shareImageUrl,
          width: 1200,
          height: 630,
          alt: `${BRAND_NAME} — restaurants in Lisbon`,
        },
      ]
    : [];

  return {
    metadataBase: new URL(SITE_URL),
    title: {
      default: siteTitle,
      template: `%s | ${BRAND_NAME}`,
    },
    description: siteDescription,
    keywords: siteKeywords,
    applicationName: BRAND_NAME,
    category: "restaurant",
    alternates: {
      canonical: "/",
    },
    openGraph: {
      title: siteTitle,
      description: siteDescription,
      url: SITE_URL,
      siteName: BRAND_NAME,
      locale: "en_GB",
      type: "website",
      ...(ogImages.length ? { images: ogImages } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: siteTitle,
      description: siteDescription,
      ...(shareImageUrl ? { images: [shareImageUrl] } : {}),
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    appleWebApp: {
      capable: true,
      title: BRAND_NAME,
      statusBarStyle: "black-translucent",
    },
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon.svg", type: "image/svg+xml" },
        { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
        { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      ],
      shortcut: [{ url: "/favicon-96x96.png", type: "image/png" }],
      apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
    },
  };
}

export async function generateMetadata() {
  try {
    const data = await getRestaurant(RESTAURANT_ID);
    const rest = data?.restaurant ?? data?.data ?? data;
    const websiteContent = mergeWebsiteContent(
      rest?.id ?? RESTAURANT_ID,
      data?.website_content ?? rest?.website_content ?? null
    );
    const shareImageUrl =
      pickShareImage(websiteContent, rest?.logo_url) ||
      getDefaultShareImage(RESTAURANT_ID);
    return buildSiteMetadata(shareImageUrl);
  } catch {
    return buildSiteMetadata(getDefaultShareImage(RESTAURANT_ID));
  }
}

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#241e19",
  /* Prevent Chrome/OS from auto-inverting the public palette */
  colorScheme: "light",
};

export default async function RootLayout({ children }) {
  let restaurantName = process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Restaurant";
  /** @type {{ address?: string | null; phone?: string | null; cuisine?: string | null; logo_url?: string | null }} */
  let restaurantMeta;
  /** @type {{ x?: string | null; facebook?: string | null; instagram?: string | null; tripadvisor?: string | null } | undefined} */
  let socialLinks;
  let schemaImage = getDefaultShareImage(RESTAURANT_ID);
  let serverDown = false;
  let theme = resolvePublicTheme(null);

  // Read the consent cookie on the server so the modal (and any GA scripts)
  // appear in the initial HTML — no flash of unconsented site, no double render.
  const cookieStore = await cookies();
  const rawConsent = cookieStore.get("cookie_consent")?.value ?? null;
  const initialConsent =
    rawConsent === "all" || rawConsent === "essential" ? rawConsent : null;
  try {
    // Race the API call against a hard timeout so a hung/dead backend can't
    // make every request block until Next.js' own timeout fires.
    const data = await Promise.race([
      getRestaurant(RESTAURANT_ID),
      new Promise((_, reject) =>
        setTimeout(() => {
          const e = new Error("Backend probe timed out");
          e.name = "AbortError";
          reject(e);
        }, SERVER_PROBE_TIMEOUT_MS)
      ),
    ]);
    const rest = data?.restaurant ?? data?.data ?? data;
    if (rest?.name) restaurantName = rest.name;
    restaurantMeta = {
      address: rest?.address ?? null,
      phone: rest?.phone ?? null,
      cuisine: rest?.cuisine ?? null,
      logo_url: rest?.logo_url ?? null,
    };
    if (rest?.social_links && typeof rest.social_links === "object") {
      socialLinks = rest.social_links;
    }
    const websiteContent = mergeWebsiteContent(
      rest?.id ?? RESTAURANT_ID,
      data?.website_content ?? rest?.website_content ?? null
    );
    schemaImage =
      pickShareImage(websiteContent, rest?.logo_url) ||
      getDefaultShareImage(RESTAURANT_ID);
    theme = resolvePublicTheme(websiteContent);
  } catch (err) {
    if (isServerUnreachable(err)) {
      serverDown = true;
    }
    // Otherwise fall back silently to env / "Restaurant" defaults below.
  }

  const themeStyle = publicThemeToCssVars(theme);

  const headerList = await headers();
  const pathLocale = String(headerList.get("x-pathname") || headerList.get("x-url") || "")
    .split("/")
    .filter(Boolean)[0];
  const htmlLang = isLocale(pathLocale) ? pathLocale : DEFAULT_LOCALE;

  // Short-circuit: render only the "service unavailable" page when the API
  // can't be reached at all. We still emit <html>/<body> because Next.js
  // requires it from the root layout, but we skip the full site shell
  // (Providers, header/footer, scripts that hit the API, etc.).
  if (serverDown) {
    return (
      <html lang={htmlLang} style={{ ...themeStyle, colorScheme: "light" }}>
        <head>
          <meta name="color-scheme" content="light" />
        </head>
        <body
          className={`${montserrat.variable} ${playfair.variable} font-sans antialiased text-base`}
          style={{ colorScheme: "light" }}
        >
          <ServiceUnavailable />
        </body>
      </html>
    );
  }

  return (
    <html lang={htmlLang} style={{ ...themeStyle, colorScheme: "light" }}>
      <head>
        <meta name="color-scheme" content="light" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Lora:wght@400;500;600;700&family=Outfit:wght@400;500;600;700&display=swap"
        />
      </head>
      <body
        className={`${montserrat.variable} ${playfair.variable} font-sans antialiased text-base`}
        style={{ colorScheme: "light" }}
      >
        <GoogleAnalytics initialConsent={initialConsent} />
        <Script
          id="organization-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              name: BRAND_NAME,
              url: SITE_URL,
              logo: schemaImage || restaurantMeta?.logo_url || undefined,
              sameAs: [
                socialLinks?.instagram,
                socialLinks?.facebook,
                socialLinks?.x,
                socialLinks?.tripadvisor,
              ].filter(Boolean),
              department: CONFIGURED_RESTAURANTS.map((r) => ({
                "@type": r.venueType === "bakery" ? "Bakery" : "Restaurant",
                name: r.label,
                url: `${SITE_URL}${locationPath(r, htmlLang)}`,
                address: r.addressFallback
                  ? {
                      "@type": "PostalAddress",
                      streetAddress: r.addressFallback,
                      addressLocality: "Lisbon",
                      addressCountry: "PT",
                    }
                  : undefined,
              })),
            }),
          }}
        />
        <OwnerAwareSiteChrome restaurantName={restaurantName} socialLinks={socialLinks}>
          <Providers>{children}</Providers>
        </OwnerAwareSiteChrome>
        <CookieConsentGate initialConsent={initialConsent} />
      </body>
    </html>
  );
}
