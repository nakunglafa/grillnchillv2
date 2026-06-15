import Link from "next/link";
import { Header } from "@/components/Header";
import { PricingBanner, RodizioMenuExplorer } from "@/components/RodizioMenuExplorer";
import { ayceLunchContent } from "@/data/all-you-can-eat-lunch";
import { getRestaurant } from "@/lib/api";
import { getDefaultShareImage, mergeWebsiteContent } from "@/lib/website-content";

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || "1";
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://thainmaki.pt";
const FALLBACK_HERO = getDefaultShareImage(RESTAURANT_ID);

function WarningIcon({ className = "h-5 w-5" }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function RulesPanel({ className = "" }) {
  return (
    <aside
      className={`rounded-sm border border-accent/30 bg-white/[0.06] p-5 sm:p-6 lg:p-7 ${className}`}
      aria-label="Dining rules and guidelines"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 shrink-0 text-accent">
          <WarningIcon />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
            Importante / Important
          </p>
          <h2 className="font-display mt-1 text-lg font-semibold text-white sm:text-xl">
            Regras Rodízio
          </h2>
          <p className="text-[12px] text-white/55">Rules for &ldquo;All You Can Eat&rdquo;</p>
        </div>
      </div>
      <ul className="mt-5 space-y-5 lg:space-y-6">
        {ayceLunchContent.rules.map((rule) => (
          <li
            key={rule.id}
            className={`border-l-4 pl-4 ${
              rule.highlight ? "border-accent" : "border-white/20"
            }`}
          >
            <h3 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white">
              {rule.titlePt}
            </h3>
            <p className="text-[11px] font-medium text-white/50">{rule.titleEn}</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-white/60">{rule.descPt}</p>
            <p className="mt-1 text-[13px] leading-relaxed text-white/80">{rule.descEn}</p>
          </li>
        ))}
      </ul>
    </aside>
  );
}

function buildStructuredData({ restaurant, websiteContent }) {
  const name = restaurant?.name || "Thai Maki";
  const address = restaurant?.address || "Almancil, Algarve";
  const phone = restaurant?.phone || undefined;
  const image =
    websiteContent.heroMainImage ||
    websiteContent.menuShowcaseSushiImage ||
    getDefaultShareImage(RESTAURANT_ID);

  const allSections = [
    ayceLunchContent.starters,
    ...ayceLunchContent.thaiMains,
    ...ayceLunchContent.sushiMains,
  ].map((section) => ({
    "@type": "MenuSection",
    name: `${section.titlePt} / ${section.titleEn}`,
  }));

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/all-you-can-eat-lunch#webpage`,
        url: `${SITE_URL}/all-you-can-eat-lunch`,
        name: "Rodizio — All-You-Can-Eat Lunch Menu",
        description: ayceLunchContent.hero.availability,
        inLanguage: ["pt-PT", "en-GB"],
      },
      {
        "@type": "Menu",
        "@id": `${SITE_URL}/all-you-can-eat-lunch#menu`,
        name: "Rodizio Lunch Menu",
        description: ayceLunchContent.hero.availability,
        hasMenuSection: allSections,
      },
      {
        "@type": "Restaurant",
        name,
        image,
        url: SITE_URL,
        telephone: phone,
        servesCuisine: ["Thai", "Japanese", "Sushi"],
        address: {
          "@type": "PostalAddress",
          streetAddress: address,
          addressCountry: "PT",
        },
      },
    ],
  };
}

export default async function AllYouCanEatLunchPage() {
  const { hero } = ayceLunchContent;

  let restaurant = null;
  let websiteContent = mergeWebsiteContent(RESTAURANT_ID, null);

  try {
    const data = await getRestaurant(RESTAURANT_ID);
    restaurant = data?.restaurant ?? data?.data ?? data;
    websiteContent = mergeWebsiteContent(
      restaurant?.id ?? RESTAURANT_ID,
      data?.website_content ?? restaurant?.website_content ?? null
    );
  } catch {
    // Static fallbacks from website-content.json
  }

  const heroMain = websiteContent.heroMainImage || FALLBACK_HERO;
  const heroSide = websiteContent.thaiImageMain || websiteContent.menuShowcaseThaiImage || heroMain;
  const parallaxCta = websiteContent.parallaxReserveBg || websiteContent.parallaxQualityBg || heroMain;
  const structuredData = buildStructuredData({ restaurant, websiteContent });

  return (
    <div className="relative min-h-screen bg-[#0a0908] text-white">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <Header variant="marketing" />

      <section className="relative min-h-[min(68vh,640px)] w-full overflow-hidden">
        <div className="absolute inset-0">
          <img
            src={heroMain}
            alt="Thai Maki rodizio lunch"
            className="h-full w-full object-cover"
            loading="eager"
            decoding="async"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-black/62" aria-hidden />
          <div
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(197,157,95,0.18),transparent_55%)]"
            aria-hidden
          />
        </div>

        <div className="relative z-10 mx-auto flex min-h-[min(68vh,640px)] max-w-6xl flex-col justify-end px-4 pb-12 pt-28 sm:pb-16 lg:px-6 lg:pb-20">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_minmax(220px,320px)] lg:gap-10">
            <header>
              <div className="flex flex-wrap items-center gap-3">
                <span className="h-px w-10 bg-accent sm:w-14" aria-hidden />
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
                  Rodízio &middot; All You Can Eat
                </p>
              </div>
              <h1 className="font-display mt-4 max-w-3xl text-[clamp(1.85rem,5.5vw,3.25rem)] font-semibold leading-tight tracking-tight text-white">
                {hero.headline}
              </h1>
              <p className="mt-2 text-lg text-white/70">{hero.headlineEn}</p>
              <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-white/82 sm:text-base">
                {hero.subheadline}
              </p>
              {hero.availability ? (
                <p className="mt-4 inline-flex max-w-xl items-start gap-2 rounded-sm border border-accent/40 bg-accent/10 px-4 py-3 text-[13px] leading-relaxed text-white/90">
                  <WarningIcon className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>{hero.availability}</span>
                </p>
              ) : null}
              {restaurant?.address ? (
                <p className="mt-3 text-[13px] text-white/60">{restaurant.address}</p>
              ) : null}
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#entradas"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-sm bg-accent px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-wood-950 transition-colors hover:bg-accent-hover"
                >
                  View the menu
                </a>
                <Link
                  href="#reserve-lunch"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-sm border-2 border-white/40 bg-white/5 px-6 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-white backdrop-blur-sm transition-colors hover:bg-white/10"
                >
                  Reserve a table
                </Link>
              </div>
            </header>

            {heroSide && heroSide !== heroMain ? (
              <div className="hidden overflow-hidden rounded-sm border border-white/15 shadow-[0_20px_50px_rgba(0,0,0,0.45)] lg:block">
                <img
                  src={heroSide}
                  alt="Thai dishes at Thai Maki"
                  className="aspect-[4/5] w-full object-cover"
                  loading="eager"
                  decoding="async"
                  sizes="320px"
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      <main className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:py-14 lg:px-6">
        <div className="mt-10 lg:hidden">
          <RulesPanel />
        </div>

        <div className="mt-10 lg:mt-14 lg:grid lg:grid-cols-[minmax(300px,360px)_1fr] lg:gap-10 xl:gap-12">
          <div className="relative hidden lg:block">
            <div className="sticky top-24 z-10">
              <RulesPanel className="shadow-[0_12px_40px_rgba(0,0,0,0.35)]" />
            </div>
          </div>

          <div className="min-w-0 space-y-10 lg:space-y-12">
            <PricingBanner />
            <RodizioMenuExplorer />
          </div>
        </div>

        <section
          id="reserve-lunch"
          className="relative mt-14 scroll-mt-28 overflow-hidden rounded-sm border border-white/10"
        >
          <div className="absolute inset-0">
            <img
              src={parallaxCta}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
              decoding="async"
              sizes="(max-width: 1152px) 100vw, 1152px"
            />
            <div className="absolute inset-0 bg-black/68" aria-hidden />
          </div>
          <div className="relative px-6 py-12 text-center sm:px-10 sm:py-14">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
              Ready to dine?
            </p>
            <h2 className="font-display mt-3 text-2xl font-semibold text-white sm:text-3xl">
              Reserve your table for lunch
            </h2>
            <p className="mx-auto mt-3 max-w-md text-[14px] leading-relaxed text-white/82">
              Book ahead for lunch (Tuesday–Friday, 12:30–15:00) and enjoy the rodizio experience
              at Thai Maki in Almancil.
            </p>
            <Link
              href="/book"
              className="mt-6 inline-flex min-h-[52px] items-center justify-center rounded-sm bg-accent px-8 py-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-wood-950 transition-colors hover:bg-accent-hover"
            >
              Reserve a table
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
