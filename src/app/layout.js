import { Montserrat, Playfair_Display } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Providers } from "./providers";
import { Footer } from "@/components/Footer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { getRestaurant } from "@/lib/api";

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
};

export default async function RootLayout({ children }) {
  let restaurantName = process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Restaurant";
  /** @type {{ address?: string | null; phone?: string | null; cuisine?: string | null; logo_url?: string | null }} */
  let restaurantMeta;
  /** @type {{ x?: string | null; facebook?: string | null; instagram?: string | null; tripadvisor?: string | null } | undefined} */
  let socialLinks;
  try {
    const data = await getRestaurant(RESTAURANT_ID);
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
  } catch (_) {
    // Fallback to env or "Restaurant" if fetch fails
  }

  return (
    <html lang="en">
      <body
        className={`${montserrat.variable} ${playfair.variable} font-sans antialiased text-base`}
      >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-6VH93MEK2E"
          strategy="afterInteractive"
        />
        <Script
          id="ga-gtag"
          strategy="afterInteractive"
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-6VH93MEK2E');
            `,
          }}
        />
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
        <div className="flex min-h-screen flex-col">
          <Providers>{children}</Providers>
          <LanguageSwitcher />
          <Footer restaurantName={restaurantName} socialLinks={socialLinks} />
        </div>
      </body>
    </html>
  );
}
