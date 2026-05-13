"use client";

import Link from "next/link";

/**
 * Reusable GDPR consent checkbox for forms that collect personal data
 * (booking, checkout, registration).
 *
 * Props:
 *  - checked: boolean
 *  - onChange: (next: boolean) => void
 *  - id: optional unique id (so multiple forms on the same page each have a
 *    distinct checkbox / label association)
 *  - variant: "dark" (default, for the booking page hero) or "light"
 *    (for the checkout / registration light-theme forms)
 *  - className: extra wrapper classes
 *
 * The component is intentionally self-contained: it renders one checkbox and
 * a short legal sentence with a link to /privacy. The parent form is
 * responsible for blocking submit while !checked and for sending
 * `gdpr_consent` + `gdpr_consent_at` to the backend.
 */
export function GdprConsent({
  checked,
  onChange,
  id = "gdpr-consent",
  variant = "dark",
  className = "",
}) {
  const isDark = variant === "dark";
  const wrap = isDark
    ? "flex items-start gap-2.5 rounded-sm border border-white/12 bg-white/4 p-3 text-[12px] leading-snug text-white/80"
    : "flex items-start gap-2.5 rounded-lg border border-zinc-300 bg-zinc-50 p-3 text-sm leading-snug text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300";

  const linkCls = isDark
    ? "underline-offset-2 font-medium text-accent hover:underline"
    : "underline-offset-2 font-medium text-zinc-900 hover:underline dark:text-zinc-100";

  return (
    <label htmlFor={id} className={`${wrap} ${className}`}>
      <input
        id={id}
        type="checkbox"
        checked={!!checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-accent"
        required
        aria-required="true"
      />
      <span>
        I consent to my personal data being processed by the restaurant{" "}
        <strong className={isDark ? "text-white" : "text-zinc-900 dark:text-zinc-100"}>
          only for the purpose
        </strong>{" "}
        of managing this booking / order, in accordance with the{" "}
        <Link href="/privacy" className={linkCls} target="_blank" rel="noopener noreferrer">
          privacy notice
        </Link>
        . My data will not be shared with third parties or used for marketing.
      </span>
    </label>
  );
}

/**
 * Synchronously collects browser-side context that is useful as a GDPR
 * audit trail (what device/browser the user was on when they consented,
 * which page they consented from, etc.). All values are best-effort and
 * may be null in privacy-hardened browsers.
 */
function collectDeviceContext() {
  if (typeof window === "undefined") return {};
  const nav = window.navigator || {};
  const scr = window.screen || {};
  let timezone = null;
  try {
    timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch (_) {
    // Intl can fail in very old engines
  }
  const screenSize =
    scr && scr.width && scr.height ? `${scr.width}x${scr.height}` : null;
  return {
    gdpr_consent_user_agent: nav.userAgent || null,
    gdpr_consent_language: nav.language || null,
    gdpr_consent_timezone: timezone,
    gdpr_consent_screen: screenSize,
    gdpr_consent_platform:
      nav.userAgentData?.platform || nav.platform || null,
    gdpr_consent_url: window.location?.href || null,
    gdpr_consent_referrer: document?.referrer || null,
  };
}

/**
 * Fetches the visitor's public IP from ipify with a short timeout.
 * Returns null if the request fails or times out. We treat this as
 * best-effort — the backend should *also* record the request IP from
 * the HTTP headers, which is the authoritative source.
 */
async function fetchPublicIp() {
  if (typeof window === "undefined") return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    const res = await fetch("https://api.ipify.org?format=json", {
      signal: controller.signal,
      cache: "no-store",
      credentials: "omit",
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    return typeof data?.ip === "string" ? data.ip : null;
  } catch (_) {
    return null;
  }
}

/**
 * Builds the payload fragment to send to the API once the user has consented.
 * Centralised so all three forms produce identical fields.
 *
 * Options:
 *   - includeDevice (default: true): include browser/device fingerprint
 *     fields (user agent, language, timezone, screen size, page URL).
 *   - includeIp (default: true): fetch the visitor's public IP from
 *     ipify and include it as `gdpr_consent_ip_client`. The backend
 *     should *also* log the request IP server-side (`gdpr_consent_ip`)
 *     since the client value is untrusted. Setting this to false skips
 *     the external request entirely.
 *
 * NOTE: This is async because the IP fetch is async. Callers should
 * `await` it. If you don't need the IP, pass `{ includeIp: false }` to
 * keep the call effectively synchronous (it still resolves immediately).
 */
export async function buildGdprConsentPayload({
  includeDevice = true,
  includeIp = true,
} = {}) {
  const base = {
    gdpr_consent: true,
    gdpr_consent_at: new Date().toISOString(),
  };

  if (includeDevice) {
    Object.assign(base, collectDeviceContext());
  }

  if (includeIp) {
    base.gdpr_consent_ip_client = await fetchPublicIp();
  }

  return base;
}
