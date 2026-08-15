"use client";

/**
 * Shared Google rating badge + review card (Shima-style), used on landing and location pages.
 */

function StarRow({ rating, className = "text-[#fbbc04]", size = "md" }) {
  const value = Number(rating);
  const filled = Number.isFinite(value) ? Math.round(Math.min(5, Math.max(0, value))) : 0;
  const sizeClass = size === "sm" ? "h-3 w-3" : "h-4 w-4";
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <svg
          key={i}
          className={`${sizeClass} ${i < filled ? "fill-current" : "fill-current opacity-25"}`}
          viewBox="0 0 20 20"
        >
          <path d="M10 15.27L16.18 19l-1.64-7.03L20 7.24l-7.19-.61L10 0 7.19 6.63 0 7.24l5.46 4.73L3.82 19z" />
        </svg>
      ))}
    </span>
  );
}

function GoogleGIcon({ className = "h-6 w-6" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

const AVATAR_COLORS = ["#0d9488", "#7c3aed", "#ea580c", "#16a34a", "#2563eb", "#db2777"];

function ReviewerAvatar({ review, index, className = "h-8 w-8" }) {
  const initial = String(review?.author || "?").trim().charAt(0).toUpperCase() || "?";
  const bg = AVATAR_COLORS[index % AVATAR_COLORS.length];
  if (review?.photoUri) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={review.photoUri}
        alt=""
        className={`${className} rounded-full object-cover ring-2 ring-white`}
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
    <span
      className={`${className} inline-flex items-center justify-center rounded-full text-[11px] font-semibold text-white ring-2 ring-white`}
      style={{ backgroundColor: bg }}
      aria-hidden
    >
      {initial}
    </span>
  );
}

export function GoogleRatingBadge({ rating, userRatingCount, reviews, href }) {
  if (rating == null) return null;
  const count = typeof userRatingCount === "number" ? userRatingCount : null;
  const avatars = (Array.isArray(reviews) ? reviews : []).slice(0, 4);
  const className =
    "google-rating-badge inline-flex max-w-full flex-wrap items-center justify-center gap-2 rounded-full px-3 py-2 shadow-[0_8px_24px_rgba(26,22,20,0.18)] sm:gap-2.5 sm:px-4";
  const inner = (
    <>
      <GoogleGIcon className="h-5 w-5 shrink-0 sm:h-6 sm:w-6" />
      <StarRow rating={5} className="text-[#fbbc04]" size="md" />
      <span className="google-rating-badge__score font-sans text-base font-bold tabular-nums sm:text-lg">
        {Number(rating).toFixed(1)}
      </span>
      {avatars.length > 0 ? (
        <span className="ml-0.5 flex items-center pl-1">
          {avatars.map((r, i) => (
            <span key={`${r.author}-${i}`} className={i === 0 ? "" : "-ml-2"}>
              <ReviewerAvatar review={r} index={i} className="h-7 w-7 sm:h-8 sm:w-8" />
            </span>
          ))}
        </span>
      ) : null}
      {count != null && count > 0 ? (
        <span className="google-rating-badge__count rounded-full px-2.5 py-1 text-[11px] font-semibold tabular-nums sm:text-xs">
          +{count.toLocaleString()}
        </span>
      ) : null}
    </>
  );
  const label = `Google rating ${Number(rating).toFixed(1)} out of 5${count != null ? ` from ${count} reviews` : ""}`;
  if (!href) {
    return (
      <div className={className} aria-label={label}>
        {inner}
      </div>
    );
  }
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={`${className} transition hover:shadow-md`} aria-label={label}>
      {inner}
    </a>
  );
}

export function GoogleReviewCard({ review, index }) {
  const text = String(review?.text || "").trim();
  const name = String(review?.author || "Google user").trim();
  const dateLabel = String(review?.relativeTime || "").trim();
  const locationLabel = String(review?.locationLabel || "").trim();
  return (
    <article className="min-w-[240px] max-w-[280px] shrink-0 rounded-2xl border border-white/10 bg-white/95 p-4 text-left text-zinc-900 shadow-lg backdrop-blur-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <ReviewerAvatar review={review} index={index} className="h-9 w-9 shrink-0" />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{name}</p>
            <p className="truncate text-[11px] text-zinc-500">
              {[dateLabel, locationLabel].filter(Boolean).join(" · ") || "Google review"}
            </p>
          </div>
        </div>
        <StarRow rating={review?.rating ?? 5} className="text-[#fbbc04]" size="sm" />
      </div>
      <p className="mt-2 line-clamp-4 font-sans text-[13px] leading-snug text-zinc-700">
        {text || "Great experience."}
      </p>
    </article>
  );
}

export function LocationStarRow({ rating, userRatingCount, className = "" }) {
  if (rating == null) return null;
  return (
    <p className={`mt-2 flex flex-wrap items-center gap-1.5 text-sm text-white/70 ${className}`}>
      <StarRow rating={rating} className="text-[#fbbc04]" size="sm" />
      <span className="font-semibold text-white">{Number(rating).toFixed(1)}</span>
      {userRatingCount != null ? (
        <span className="text-white/45">· {userRatingCount.toLocaleString()} reviews</span>
      ) : null}
    </p>
  );
}
