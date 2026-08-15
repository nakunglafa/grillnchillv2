"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { GoogleRatingBadge, GoogleReviewCard, LocationStarRow } from "@/components/GoogleRatingUI";
import { useRestaurant } from "@/context/RestaurantContext";
import { locationPath } from "@/lib/restaurants";
import { useLocale } from "@/lib/use-locale";
import { getMessages, t } from "@/lib/messages";
import { getBranchCopy } from "@/lib/branch-copy";

const BRAND =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
  "Grill N Chill";

const HERO_IMAGE =
  process.env.NEXT_PUBLIC_HERO_COLLAGE_MAIN ||
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1600&q=80";

export function HomePageClient() {
  const locale = useLocale();
  const messages = getMessages(locale);
  const { restaurants, setActiveRestaurantId, hydrated } = useRestaurant();
  const [reviewsPayload, setReviewsPayload] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/google-reviews?all=1")
      .then((res) => res.json())
      .then((payload) => {
        if (!cancelled) setReviewsPayload(payload);
      })
      .catch(() => {
        if (!cancelled) setReviewsPayload(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const aggregate = reviewsPayload?.aggregate || null;
  const locationRatings = useMemo(() => {
    const map = new Map();
    const list = Array.isArray(reviewsPayload?.locations) ? reviewsPayload.locations : [];
    for (const loc of list) {
      if (loc?.slug) map.set(loc.slug, loc);
    }
    return map;
  }, [reviewsPayload]);

  const googleReviews = useMemo(() => {
    const raw = aggregate?.reviews;
    if (!Array.isArray(raw)) return [];
    return raw.filter((r) => String(r?.text || "").trim()).slice(0, 6);
  }, [aggregate]);

  return (
    <div className="min-h-screen bg-[#0a0908] text-white">
      <Header variant="overlay" />

      <section className="relative isolate min-h-[78vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/55 via-black/45 to-[#0a0908]" aria-hidden />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-[calc(var(--site-header-height)+2.75rem+env(safe-area-inset-top,0px))] sm:px-6 sm:pb-20 sm:pt-[calc(var(--site-header-height)+3.5rem)]">
          {aggregate?.rating != null ? (
            <div className="mb-6 flex justify-center sm:justify-start">
              <GoogleRatingBadge
                rating={aggregate.rating}
                userRatingCount={aggregate.userRatingCount}
                reviews={googleReviews}
              />
            </div>
          ) : null}
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-accent">
            {t(messages, "home.eyebrow", "Lisbon")}
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-white sm:text-7xl">
            {BRAND}
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/75 sm:text-lg">
            {t(messages, "home.supporting")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#locations"
              className="inline-flex rounded-full bg-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-wood-950 transition hover:bg-accent-hover"
            >
              {t(messages, "home.ctaLocations", "Our locations")}
            </a>
          </div>

          {googleReviews.length > 0 ? (
            <div className="mt-10 -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {googleReviews.map((review, index) => (
                <GoogleReviewCard key={`${review.author}-${index}`} review={review} index={index} />
              ))}
            </div>
          ) : null}
        </div>
      </section>

      <section id="locations" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {t(messages, "home.locationsTitle", "Our locations")}
          </h2>
          <p className="mt-3 text-white/65">{t(messages, "home.locationsIntro")}</p>
        </div>

        {!hydrated ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((location) => {
              const place = locationRatings.get(location.slug);
              const branch = getBranchCopy(location.slug, locale);
              return (
                <article
                  key={location.id}
                  className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-accent/40 hover:bg-white/8"
                >
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                      {branch?.venueLabel || location.venueLabel || location.shortLabel}
                    </p>
                    <h3 className="mt-2 font-display text-2xl font-semibold text-white">
                      <Link
                        href={locationPath(location, locale)}
                        className="transition-colors hover:text-accent"
                        onClick={() => setActiveRestaurantId(location.id)}
                      >
                        {location.name || location.label}
                      </Link>
                    </h3>
                    {branch?.headline ? (
                      <p className="mt-2 text-sm text-white/70">{branch.headline}</p>
                    ) : null}
                    <LocationStarRow rating={place?.rating} userRatingCount={place?.userRatingCount} />
                    {location.address ? (
                      <p className="mt-3 text-sm leading-relaxed text-white/60">{location.address}</p>
                    ) : (
                      <p className="mt-3 text-sm text-white/45">
                        {t(messages, "common.addressSoon", "Address coming soon")}
                      </p>
                    )}
                    {location.phone ? (
                      <p className="mt-2 text-sm text-white/55">{location.phone}</p>
                    ) : null}
                  </div>
                  <div className="mt-8">
                    <Link
                      href={locationPath(location, locale)}
                      onClick={() => setActiveRestaurantId(location.id)}
                      className="inline-flex rounded-full border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:border-white/50"
                    >
                      {t(messages, "home.openLocation", "Open location")}
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
