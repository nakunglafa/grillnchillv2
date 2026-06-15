import { getRestaurant } from "@/lib/api";
import { getDefaultShareImage, mergeWebsiteContent, pickShareImage } from "@/lib/website-content";

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || "1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://thainmaki.pt";

const FALLBACK_TITLE =
  "Rodizio Lunch Menu | All-You-Can-Eat Thai & Sushi in Almancil, Faro, Algarve";

const FALLBACK_DESCRIPTION =
  "Thai Maki rodizio — all-you-can-eat lunch only (Tuesday–Friday, 12:30–15:00). Thai classics, sushi combinations, rolls, hot sushi, nigiri and gunkan in Almancil near Faro, Algarve.";

const FALLBACK_LOGO = getDefaultShareImage(process.env.NEXT_PUBLIC_RESTAURANT_ID || "1");

function buildMetadata({ title, description, shareImageUrl, name }) {
  return {
    title,
    description,
    alternates: {
      canonical: "/all-you-can-eat-lunch",
    },
    openGraph: {
      title,
      description,
      url: "/all-you-can-eat-lunch",
      type: "website",
      siteName: "Thai Maki",
      locale: "en_GB",
      images: [
        {
          url: shareImageUrl,
          width: 1200,
          height: 630,
          alt: `${name} — Rodizio lunch menu`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [shareImageUrl],
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
}

export async function generateMetadata() {
  try {
    const data = await getRestaurant(RESTAURANT_ID);
    const restaurant = data?.restaurant ?? data?.data ?? data;

    const name = restaurant?.name || "Thai Maki";
    const address = restaurant?.address || "Almancil, Algarve";
    const logoUrl = restaurant?.logo_url || FALLBACK_LOGO;
    const websiteContent = mergeWebsiteContent(
      restaurant?.id ?? RESTAURANT_ID,
      data?.website_content ?? restaurant?.website_content ?? null
    );
    const shareImageUrl =
      pickShareImage(websiteContent, logoUrl) || FALLBACK_LOGO;

    const title = FALLBACK_TITLE;
    const description =
      `Rodizio (all-you-can-eat) lunch at ${name} in ${address} — available Tuesday to Friday, 12:30–15:00 only. ` +
      "Thai classics, sushi combinations, rolls, hot sushi, nigiri and gunkan in Almancil near Faro, Algarve.";

    return buildMetadata({ title, description, shareImageUrl, name });
  } catch {
    return buildMetadata({
      title: FALLBACK_TITLE,
      description: FALLBACK_DESCRIPTION,
      shareImageUrl: FALLBACK_LOGO,
      name: "Thai Maki",
    });
  }
}

export default function AllYouCanEatLunchLayout({ children }) {
  return children;
}
