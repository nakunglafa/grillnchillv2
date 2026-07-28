"use client";

import { useEffect, useRef, useState } from "react";

function Stars({ rating }) {
  if (rating == null) return null;
  const full = Math.round(Number(rating));
  return (
    <span className="text-accent" aria-label={`${rating} out of 5 stars`}>
      {"★".repeat(Math.min(5, Math.max(0, full)))}
      <span className="text-white/25">{"★".repeat(Math.max(0, 5 - full))}</span>
    </span>
  );
}

/**
 * Google reviews carousel for a branch slug (Soul & Sip / Nina-style social proof).
 */
export function LocationGoogleReviews({ slug, venueName }) {
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
              What guests say
            </h2>
            {data.rating != null ? (
              <p className="mt-2 text-sm text-white/65">
                <Stars rating={data.rating} />{" "}
                <span className="font-semibold text-white">{Number(data.rating).toFixed(1)}</span>
                {data.userRatingCount != null ? (
                  <span className="text-white/45"> · {data.userRatingCount} Google reviews</span>
                ) : null}
                {venueName ? <span className="text-white/45"> · {venueName}</span> : null}
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollBy(-1)}
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:border-white/40"
              aria-label="Previous reviews"
            >
              ←
            </button>
            <button
              type="button"
              onClick={() => scrollBy(1)}
              className="rounded-md border border-white/20 px-3 py-1.5 text-sm text-white/80 hover:border-white/40"
              aria-label="Next reviews"
            >
              →
            </button>
          </div>
        </div>

        {reviews.length > 0 ? (
          <div
            ref={scrollerRef}
            className="mt-8 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {reviews.map((r, i) => (
              <article
                key={`${r.author}-${i}`}
                className="w-[min(100%,18rem)] shrink-0 snap-start rounded-xl border border-white/10 bg-white/5 p-5"
              >
                <div className="flex items-center gap-3">
                  {r.photoUri ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.photoUri} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-xs font-semibold">
                      {(r.author || "G").slice(0, 1)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{r.author}</p>
                    <p className="text-xs text-white/45">{r.relativeTime || "Google review"}</p>
                  </div>
                </div>
                <p className="mt-2 text-sm text-accent">
                  <Stars rating={r.rating} />
                </p>
                <p className="mt-2 line-clamp-5 text-sm leading-relaxed text-white/70">{r.text}</p>
              </article>
            ))}
          </div>
        ) : null}

        {data.googleMapsUri ? (
          <p className="mt-6">
            <a
              href={data.googleMapsUri}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-accent hover:text-accent-hover"
            >
              See all Google reviews →
            </a>
          </p>
        ) : null}
      </div>
    </section>
  );
}
