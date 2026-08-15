"use client";

import { useEffect, useRef, useState } from "react";
import { GoogleRatingBadge, GoogleReviewCard } from "@/components/GoogleRatingUI";
import { getMessages, t } from "@/lib/messages";
import { useLocale } from "@/lib/use-locale";

/**
 * Google reviews for a branch slug — Place ID resolved on Laravel via restaurant id.
 */
export function LocationGoogleReviews({ slug, venueName }) {
  const locale = useLocale();
  const messages = getMessages(locale);
  const [data, setData] = useState(null);
  const scrollerRef = useRef(null);

  useEffect(() => {
    if (!slug) return undefined;
    let cancelled = false;
    fetch(`/api/google-reviews?slug=${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setData({ reviews: [], rating: null });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (!data) {
    return (
      <section className="border-b border-white/10 py-12" aria-busy="true">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="h-8 w-48 animate-pulse rounded bg-white/10" />
          <div className="mt-6 flex gap-4 overflow-hidden">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-40 w-72 shrink-0 animate-pulse rounded-xl bg-white/5" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  const reviews = Array.isArray(data.reviews) ? data.reviews.filter((r) => r.text) : [];
  if (reviews.length === 0 && data.rating == null) return null;

  function scrollBy(dir) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(320, el.clientWidth * 0.8), behavior: "smooth" });
  }

  return (
    <section id="reviews" className="border-b border-white/10 py-12" aria-labelledby="reviews-heading">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">Google</p>
            <h2 id="reviews-heading" className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              {t(messages, "location.reviewsTitle")}
            </h2>
            {venueName ? <p className="mt-1 text-sm text-white/50">{venueName}</p> : null}
            {data.rating != null ? (
              <div className="mt-4">
                <GoogleRatingBadge
                  rating={data.rating}
                  userRatingCount={data.userRatingCount}
                  reviews={reviews}
                  href={data.googleMapsUri}
                />
              </div>
            ) : null}
          </div>
          {reviews.length > 1 ? (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => scrollBy(-1)}
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-wide text-white/80 hover:border-white/40"
                aria-label={t(messages, "common.prev")}
              >
                {t(messages, "common.prev")}
              </button>
              <button
                type="button"
                onClick={() => scrollBy(1)}
                className="rounded-full border border-white/20 px-3 py-1.5 text-xs uppercase tracking-wide text-white/80 hover:border-white/40"
                aria-label={t(messages, "common.next")}
              >
                {t(messages, "common.next")}
              </button>
            </div>
          ) : null}
        </div>

        {reviews.length > 0 ? (
          <div
            ref={scrollerRef}
            className="mt-8 flex gap-4 overflow-x-auto pb-2 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {reviews.slice(0, 8).map((review, index) => (
              <GoogleReviewCard key={`${review.author}-${index}`} review={review} index={index} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
