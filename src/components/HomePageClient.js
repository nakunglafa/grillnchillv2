"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
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

const SLIDE_MS = 6000;

export function HomePageClient({ heroSlides = [] }) {
  const locale = useLocale();
  const messages = getMessages(locale);
  const { restaurants, setActiveRestaurantId, hydrated } = useRestaurant();
  const [reviewsPayload, setReviewsPayload] = useState(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const slides = useMemo(
    () => (Array.isArray(heroSlides) ? heroSlides.filter(Boolean) : []),
    [heroSlides]
  );
  const slideCount = slides.length;
  const activeSlide = slideCount > 0 ? slides[activeIndex % slideCount] : null;

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

  const goNext = useEffectEvent(() => {
    if (slideCount < 2) return;
    setActiveIndex((i) => (i + 1) % slideCount);
  });

  const goPrev = useEffectEvent(() => {
    if (slideCount < 2) return;
    setActiveIndex((i) => (i - 1 + slideCount) % slideCount);
  });

  useEffect(() => {
    if (paused || slideCount < 2) return undefined;
    const id = window.setInterval(() => goNext(), SLIDE_MS);
    return () => window.clearInterval(id);
  }, [paused, slideCount]);

  useEffect(() => {
    if (slideCount === 0) return;
    setActiveIndex((i) => (i >= slideCount ? 0 : i));
  }, [slideCount]);

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

      <section
        className="relative isolate min-h-[78vh] overflow-hidden"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget)) setPaused(false);
        }}
        aria-roledescription="carousel"
        aria-label={t(messages, "home.locationsTitle", "Our locations")}
      >
        {slides.map((slide, index) => {
          const isActive = index === activeIndex;
          return (
            <div
              key={slide.id || slide.slug || index}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                isActive ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden={!isActive}
            >
              {slide.image ? (
                <div
                  className="absolute inset-0 scale-105 bg-cover bg-center transition-transform duration-[7000ms] ease-out"
                  style={{
                    backgroundImage: `url(${slide.image})`,
                    transform: isActive ? "scale(1.06)" : "scale(1.02)",
                  }}
                  aria-hidden
                />
              ) : (
                <div
                  className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_20%,rgba(197,157,95,0.22),transparent_58%),linear-gradient(180deg,#1a1510_0%,#0a0908_100%)]"
                  aria-hidden
                />
              )}
            </div>
          );
        })}
        {slides.length === 0 ? (
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_20%,rgba(197,157,95,0.22),transparent_58%),linear-gradient(180deg,#1a1510_0%,#0a0908_100%)]"
            aria-hidden
          />
        ) : null}

        <div className="absolute inset-0 bg-linear-to-b from-black/30 via-black/25 to-[#0a0908]" aria-hidden />

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
            {t(messages, "home.eyebrow", "Nepali · Indian · Lisbon")}
          </p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-white sm:text-7xl">
            {BRAND}
          </h1>
          <p className="mt-2 max-w-xl text-sm font-medium text-white/90 sm:text-base">
            {t(
              messages,
              "home.heroTagline",
              "Best Nepali & Indian restaurant in Lisbon"
            )}
          </p>

          {activeSlide ? (
            <div
              key={activeSlide.id || activeSlide.slug}
              className="mt-6 max-w-xl home-hero-slide-copy"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                {activeSlide.venueLabel || activeSlide.shortLabel}
              </p>
              <p className="mt-1 font-display text-2xl font-semibold text-white sm:text-3xl">
                {activeSlide.name}
              </p>
              {activeSlide.headline ? (
                <p className="mt-2 text-sm text-white/80 sm:text-base">{activeSlide.headline}</p>
              ) : null}
              {activeSlide.address ? (
                <p className="mt-2 text-sm leading-relaxed text-white/60">{activeSlide.address}</p>
              ) : null}
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href={activeSlide.href}
                  onClick={() => setActiveRestaurantId(activeSlide.id)}
                  className="inline-flex rounded-full bg-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-wood-950 transition hover:bg-accent-hover"
                >
                  {t(messages, "home.openLocation", "Open location")}
                </Link>
                <a
                  href="#locations"
                  className="inline-flex rounded-full border border-white/25 px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:border-white/50"
                >
                  {t(messages, "home.ctaLocations", "Our locations")}
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href="#locations"
                className="inline-flex rounded-full bg-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-wood-950 transition hover:bg-accent-hover"
              >
                {t(messages, "home.ctaLocations", "Our locations")}
              </a>
            </div>
          )}

          {slideCount > 1 ? (
            <div className="mt-8 flex items-center gap-3">
              <button
                type="button"
                onClick={goPrev}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/85 transition hover:border-white/50 hover:bg-white/10"
                aria-label="Previous location"
              >
                <span aria-hidden>‹</span>
              </button>
              <div className="flex items-center gap-2" role="tablist" aria-label="Location slides">
                {slides.map((slide, index) => (
                  <button
                    key={slide.id || slide.slug || index}
                    type="button"
                    role="tab"
                    aria-selected={index === activeIndex}
                    aria-label={slide.shortLabel || slide.name}
                    onClick={() => setActiveIndex(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      index === activeIndex
                        ? "w-7 bg-accent"
                        : "w-2.5 bg-white/35 hover:bg-white/55"
                    }`}
                  />
                ))}
              </div>
              <button
                type="button"
                onClick={goNext}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/25 text-white/85 transition hover:border-white/50 hover:bg-white/10"
                aria-label="Next location"
              >
                <span aria-hidden>›</span>
              </button>
            </div>
          ) : null}

          {googleReviews.length > 0 ? (
            <div className="scrollbar-hide mt-10 -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
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
              const slide = slides.find((s) => s.id === location.id || s.slug === location.slug);
              return (
                <article
                  key={location.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm transition hover:border-accent/40 hover:bg-white/8"
                >
                  <div className="relative h-36 w-full overflow-hidden bg-[#14110e]">
                    {slide?.image ? (
                      <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${slide.image})` }}
                        aria-hidden
                      />
                    ) : (
                      <div
                        className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_20%,rgba(197,157,95,0.18),transparent_60%)]"
                        aria-hidden
                      />
                    )}
                    <div className="absolute inset-0 bg-linear-to-t from-[#0a0908]/80 to-transparent" aria-hidden />
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-6">
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
