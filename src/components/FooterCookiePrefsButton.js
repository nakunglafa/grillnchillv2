"use client";

import { COOKIE_CONSENT_EVENT } from "@/components/CookieConsentGate";

/**
 * Footer button that clears the saved cookie choice so the consent gate
 * re-appears. Lives in its own client file because Footer is a server
 * component.
 */
export function FooterCookiePrefsButton() {
  const reopen = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem("cookie_consent");
    } catch (_) {
      // ignore
    }
    // Expire the cookie so SSR also sees "no choice" on the next request.
    document.cookie = "cookie_consent=;path=/;max-age=0;samesite=lax";
    // Notify listeners (e.g. GA component) and force the gate to re-render
    // by reloading — simplest and avoids needing a global state container.
    window.dispatchEvent(
      new CustomEvent(COOKIE_CONSENT_EVENT, { detail: null })
    );
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={reopen}
      className="transition-colors hover:text-white/80"
    >
      Cookie preferences
    </button>
  );
}
