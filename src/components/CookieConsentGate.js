"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const COOKIE_NAME = "cookie_consent";
const STORAGE_KEY = "cookie_consent";
const VALID_VALUES = ["all", "essential"];

function isValidConsent(value) {
  return typeof value === "string" && VALID_VALUES.includes(value);
}

function readClientConsent() {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isValidConsent(stored)) return stored;
  } catch (_) {
    // localStorage may be unavailable (private mode, embedded contexts)
  }
  if (typeof document !== "undefined") {
    const match = document.cookie.match(
      new RegExp(`(?:^|;\\s*)${COOKIE_NAME}=([^;]+)`)
    );
    const fromCookie = match?.[1] ? decodeURIComponent(match[1]) : "";
    if (isValidConsent(fromCookie)) return fromCookie;
  }
  return null;
}

function persistConsent(value) {
  if (!isValidConsent(value)) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch (_) {
    // ignore
  }
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(
    value
  )};path=/;max-age=31536000;samesite=lax`;
  // Notify the rest of the app (e.g. GoogleAnalytics) that consent changed.
  window.dispatchEvent(
    new CustomEvent("cookie-consent-changed", { detail: value })
  );
}

/**
 * Full-screen blocking consent gate.
 *
 * `initialConsent` is read on the server from the request cookies so the
 * modal is present in the initial HTML (no flash, no layout shift). After
 * mount we re-read localStorage in case the user already chose in another
 * tab; localStorage wins because it survives where cookies might not.
 */
export function CookieConsentGate({ initialConsent = null }) {
  const [consent, setConsent] = useState(
    isValidConsent(initialConsent) ? initialConsent : null
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const fromClient = readClientConsent();
    if (fromClient && fromClient !== consent) {
      setConsent(fromClient);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll while the modal is open.
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!consent) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [consent]);

  // Trap focus inside the modal while it is open (simple Tab/Shift+Tab cycle).
  useEffect(() => {
    if (!consent && hydrated && typeof document !== "undefined") {
      const dialog = document.getElementById("cookie-consent-dialog");
      const acceptBtn = document.getElementById("cookie-consent-accept");
      acceptBtn?.focus();
      const onKey = (e) => {
        if (e.key !== "Tab" || !dialog) return;
        const focusable = dialog.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      };
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [consent, hydrated]);

  if (consent) return null;

  const choose = (value) => {
    persistConsent(value);
    setConsent(value);
  };

  return (
    <div
      className="fixed inset-0 z-200 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="cookie-consent-title"
      aria-describedby="cookie-consent-desc"
    >
      <div
        id="cookie-consent-dialog"
        className="w-full max-w-lg rounded-t-2xl bg-[#0a0908] p-5 text-white shadow-[0_20px_60px_rgba(0,0,0,0.55)] ring-1 ring-white/10 sm:rounded-2xl sm:p-6"
      >
        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-accent">
          Before you continue
        </p>
        <h2
          id="cookie-consent-title"
          className="font-display mt-1 text-xl font-semibold tracking-tight sm:text-2xl"
        >
          Cookies &amp; privacy
        </h2>
        <p id="cookie-consent-desc" className="mt-3 text-sm leading-relaxed text-white/75">
          We use cookies that are strictly necessary for the site to work
          (login, language, cart). With your consent, we also use anonymous
          analytics to help us improve the experience. We never sell your data
          or use it for advertising.
        </p>
        <p className="mt-3 text-xs leading-relaxed text-white/55">
          By continuing you agree to our use of essential cookies and to our{" "}
          <Link
            href="/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            privacy notice
          </Link>
          . You can change your choice at any time from the link in the footer.
        </p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-3">
          <button
            type="button"
            onClick={() => choose("essential")}
            className="touch-manipulation inline-flex h-11 w-full items-center justify-center rounded-full border border-white/20 px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/90 transition-colors hover:bg-white/10 sm:w-auto"
          >
            Essential only
          </button>
          <button
            id="cookie-consent-accept"
            type="button"
            onClick={() => choose("all")}
            className="touch-manipulation inline-flex h-11 w-full items-center justify-center rounded-full bg-accent px-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-wood-950 shadow-md transition-colors hover:bg-accent-hover sm:w-auto"
          >
            Accept all
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Tiny helper that other client components can call to read the current
 * consent value (e.g. so analytics know whether to initialise).
 */
export function getCurrentConsent() {
  return readClientConsent();
}

export const COOKIE_CONSENT_EVENT = "cookie-consent-changed";
