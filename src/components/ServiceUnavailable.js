"use client";

/**
 * Full-screen "site temporarily unavailable" page rendered by the root layout
 * when the backend API cannot be reached on the initial server-side fetch.
 *
 * Network errors (ECONNREFUSED, DNS failure, timeout) and 5xx responses all
 * land here. 4xx responses (404 etc.) are treated as config problems and the
 * site continues to render with fallback data.
 */
export function ServiceUnavailable() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0a0908] px-6 text-white">
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/5">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="text-[#c49a6c]"
          >
            <path d="M2 12s3-7 10-7 10 7 10 7" />
            <path d="M2 12s3 7 10 7 10-7 10-7" />
            <line x1="2" y1="2" x2="22" y2="22" />
          </svg>
        </div>
        <h1 className="font-display text-2xl font-semibold tracking-tight md:text-3xl">
          Site temporarily unavailable
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-white/65 md:text-base">
          We&apos;re having trouble reaching our servers right now. Please try
          again in a moment.
        </p>
        <button
          type="button"
          onClick={() => {
            if (typeof window !== "undefined") window.location.reload();
          }}
          className="mt-7 inline-flex h-11 items-center justify-center rounded-full bg-[#c49a6c] px-6 text-sm font-semibold uppercase tracking-[0.18em] text-[#0a0908] transition-colors hover:bg-[#d6ae7e]"
        >
          Retry
        </button>
        <p className="mt-6 text-[11px] uppercase tracking-[0.2em] text-white/35">
          If the problem persists, please contact us by phone.
        </p>
      </div>
    </main>
  );
}
