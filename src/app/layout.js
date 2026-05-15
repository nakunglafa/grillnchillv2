import { Montserrat, Playfair_Display } from "next/font/google";
import Script from "next/script";
import { cookies } from "next/headers";
import "./globals.css";
import { Providers } from "./providers";
import { OwnerAwareSiteChrome } from "@/components/OwnerAwareSiteChrome";
import { ServiceUnavailable } from "@/components/ServiceUnavailable";
import { CookieConsentGate } from "@/components/CookieConsentGate";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";
import { getRestaurant } from "@/lib/api";

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

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || "1";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://restaurant.digitallisbon.pt").replace(/\/$/, "");

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

const siteTitle =
  "Thai Maki | Thai and Sushi Restaurant in Almancil, Faro, Algarve";
const siteDescription =
  "Thai Maki is a Thai and sushi restaurant in Almancil, near Faro, Algarve. Enjoy fresh sushi, authentic Thai food, and easy online table booking.";
const siteKeywords = [
  "Thai Maki",
  "Thai restaurant Almancil",
  "Thai restaurant Faro",
  "Thai restaurant Algarve",
  "sushi restaurant Almancil",
  "sushi restaurant Faro",
  "sushi restaurant Algarve",
  "Thai restaurant near me",
  "sushi restaurant near me",
  "Thai food near me",
  "sushi near me",
  "Thai food Algarve",
  "book restaurant table Almancil",
  "restaurant menu Almancil",
];

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: siteTitle,
    template: "%s | Thai Maki",
  },
  description: siteDescription,
  keywords: siteKeywords,
  applicationName: "Thai Maki",
  category: "restaurant",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteTitle,
    description: siteDescription,
    url: SITE_URL,
    siteName: "Thai Maki",
    locale: "en_GB",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
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
    title: process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() || "Thai Maki",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/android-chrome-192x192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#241e19",
  colorScheme: "dark",
};

export default async function RootLayout({ children }) {
  let restaurantName = process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Restaurant";
  /** @type {{ address?: string | null; phone?: string | null; cuisine?: string | null; logo_url?: string | null }} */
  let restaurantMeta;
  /** @type {{ x?: string | null; facebook?: string | null; instagram?: string | null; tripadvisor?: string | null } | undefined} */
  let socialLinks;
  let serverDown = false;

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
  } catch (err) {
    if (isServerUnreachable(err)) {
      serverDown = true;
    }
    // Otherwise fall back silently to env / "Restaurant" defaults below.
  }

  // Short-circuit: render only the "service unavailable" page when the API
  // can't be reached at all. We still emit <html>/<body> because Next.js
  // requires it from the root layout, but we skip the full site shell
  // (Providers, header/footer, scripts that hit the API, etc.).
  if (serverDown) {
    return (
      <html lang="en">
        <body
          className={`${montserrat.variable} ${playfair.variable} font-sans antialiased text-base`}
        >
          <ServiceUnavailable />
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${playfair.variable} font-sans antialiased text-base`}
      >
        <GoogleAnalytics initialConsent={initialConsent} />
        <Script
          id="restaurant-schema"
          type="application/ld+json"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Restaurant",
              name: restaurantName,
              image: restaurantMeta?.logo_url || undefined,
              address: restaurantMeta?.address
                ? {
                    "@type": "PostalAddress",
                    streetAddress: restaurantMeta.address,
                    addressCountry: "PT",
                  }
                : undefined,
              url: SITE_URL,
              telephone: restaurantMeta?.phone || undefined,
              servesCuisine: restaurantMeta?.cuisine ? [restaurantMeta.cuisine] : ["Thai", "Japanese", "Sushi"],
              priceRange: "$$",
              openingHoursSpecification: [
                {
                  "@type": "OpeningHoursSpecification",
                  dayOfWeek: [
                    "Monday",
                    "Tuesday",
                    "Wednesday",
                    "Thursday",
                    "Friday",
                    "Saturday",
                    "Sunday",
                  ],
                  opens: "12:00",
                  closes: "23:00",
                },
              ],
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
