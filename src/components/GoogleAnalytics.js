"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import { COOKIE_CONSENT_EVENT, getCurrentConsent } from "@/components/CookieConsentGate";

const GA_ID = "G-6VH93MEK2E";

/**
 * Loads Google Analytics only when the visitor has chosen "Accept all".
 * `initialConsent` is read on the server so we can render the GA scripts
 * directly in the initial HTML when consent is already present.
 *
 * The component subscribes to the in-page consent event so toggling on
 * works without a full page reload. (Toggling off requires a reload to
 * fully drop the GA runtime; that is GA's behaviour, not ours.)
 */
export function GoogleAnalytics({ initialConsent = null }) {
  const [consent, setConsent] = useState(initialConsent === "all");

  useEffect(() => {
    if (!consent) {
      const current = getCurrentConsent();
      if (current === "all") setConsent(true);
    }
    const onChange = (e) => {
      setConsent(e?.detail === "all");
    };
    window.addEventListener(COOKIE_CONSENT_EVENT, onChange);
    return () => window.removeEventListener(COOKIE_CONSENT_EVENT, onChange);
  }, [consent]);

  if (!consent) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
      />
      <Script
        id="ga-gtag"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_ID}', { anonymize_ip: true });
          `,
        }}
      />
    </>
  );
}
