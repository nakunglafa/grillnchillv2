"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";

const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Francais" },
  { code: "pt", label: "Portugues" },
  { code: "de", label: "Deutsch" },
];

const GOOGLE_SCRIPT_ID = "google-translate-script";
const SITE_LANGUAGE_KEY = "site-language";
const SITE_LANGUAGE_COOKIE = "site_language";
const DEFAULT_LANGUAGE = "en";

function isSupportedLanguage(lang) {
  return SUPPORTED_LANGUAGES.some((entry) => entry.code === lang);
}

function getCookie(name) {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}=([^;]+)`)
  );
  return match?.[1] ? decodeURIComponent(match[1]) : "";
}

// Build the list of cookie domain scopes a browser may have stored a cookie
// under for the current host. Google Translate is known to write `googtrans`
// on BOTH the exact host and the leading-dot (parent) domain, so we must
// read/write on all of them to keep state consistent.
function getCookieDomainScopes() {
  if (typeof window === "undefined") return [""];
  const hostname = window.location.hostname || "";
  const scopes = [""]; // no domain attribute (exact host)
  const isIp = /^\d+\.\d+\.\d+\.\d+$/.test(hostname);
  const isLocal = hostname === "localhost" || hostname === "" || isIp;
  if (!isLocal && hostname.includes(".")) {
    scopes.push(`;domain=${hostname}`);
    scopes.push(`;domain=.${hostname}`);
    const parts = hostname.split(".");
    if (parts.length > 2) {
      // also handle the registrable parent (e.g. example.com from www.example.com)
      const parent = parts.slice(-2).join(".");
      scopes.push(`;domain=.${parent}`);
    }
  }
  return scopes;
}

function setCookieAllScopes(name, value) {
  if (typeof document === "undefined") return;
  const encoded = encodeURIComponent(value);
  const base = "path=/;max-age=31536000;samesite=lax";
  for (const scope of getCookieDomainScopes()) {
    document.cookie = `${name}=${encoded};${base}${scope}`;
  }
}

function deleteCookieAllScopes(name) {
  if (typeof document === "undefined") return;
  const expired = "expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
  for (const scope of getCookieDomainScopes()) {
    document.cookie = `${name}=;${expired}${scope}`;
  }
}

function getLanguageFromCookie() {
  if (typeof document === "undefined") return DEFAULT_LANGUAGE;
  const value = getCookie("googtrans").trim();
  if (!value) return DEFAULT_LANGUAGE;
  const parts = value.split("/");
  const lang = parts[parts.length - 1] || DEFAULT_LANGUAGE;
  return isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
}

function setGoogleTranslateCookie(lang) {
  const safeLang = isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
  // Always clear any pre-existing googtrans cookie across all scopes first.
  // This prevents the widget from picking a stale value when both an exact-
  // host and a leading-dot cookie coexist (a common cause of the language
  // "reverting" after a switch).
  deleteCookieAllScopes("googtrans");
  if (safeLang === DEFAULT_LANGUAGE) {
    // For the source language Google expects NO cookie at all. Setting
    // `/en/en` leaves the widget in a half-translated state on some pages.
    return;
  }
  setCookieAllScopes("googtrans", `/en/${safeLang}`);
}

function getStoredLanguage() {
  if (typeof window === "undefined") return DEFAULT_LANGUAGE;
  // googtrans is the source of truth for what is actually rendered, so check
  // it first. The app cookie / localStorage are secondary mirrors used when
  // googtrans is absent (e.g. fresh visit).
  const fromGoogle = getLanguageFromCookie();
  if (fromGoogle && fromGoogle !== DEFAULT_LANGUAGE) return fromGoogle;
  const fromAppCookie = getCookie(SITE_LANGUAGE_COOKIE);
  if (isSupportedLanguage(fromAppCookie)) return fromAppCookie;
  const fromStorage = window.localStorage.getItem(SITE_LANGUAGE_KEY) || "";
  if (isSupportedLanguage(fromStorage)) return fromStorage;
  return DEFAULT_LANGUAGE;
}

function persistSelectedLanguage(lang) {
  const safeLang = isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE;
  // Mirror the choice in our own cookie + localStorage so we can still recover
  // it if Google Translate clears googtrans for any reason.
  if (safeLang === DEFAULT_LANGUAGE) {
    deleteCookieAllScopes(SITE_LANGUAGE_COOKIE);
  } else {
    setCookieAllScopes(SITE_LANGUAGE_COOKIE, safeLang);
  }
  setGoogleTranslateCookie(safeLang);
  if (typeof window !== "undefined") {
    if (safeLang === DEFAULT_LANGUAGE) {
      window.localStorage.removeItem(SITE_LANGUAGE_KEY);
    } else {
      window.localStorage.setItem(SITE_LANGUAGE_KEY, safeLang);
    }
  }
}

export default function LanguageSwitcher() {
  // The owner dashboard is intentionally kept in English only. We hide the
  // switcher and skip Google Translate initialization for any /owner/* route.
  const pathname = usePathname();
  const isOwnerDashboard = pathname?.startsWith("/owner");
  const [selectedLanguage, setSelectedLanguage] = useState(DEFAULT_LANGUAGE);

  const includedLanguages = useMemo(
    () => SUPPORTED_LANGUAGES.map((entry) => entry.code).join(","),
    []
  );

  useEffect(() => {
    // Only sync the dropdown UI with whatever is already in the cookie.
    // DO NOT re-write the cookie here — that used to cause the language to
    // silently "revert" if our mirror cookies drifted from googtrans.
    const preferredLanguage = getStoredLanguage();
    setSelectedLanguage(preferredLanguage);
    // Best-effort: if googtrans is missing but we have a stored preference,
    // re-apply it once so the Google widget sees the right cookie.
    const currentGoogle = getLanguageFromCookie();
    if (currentGoogle === DEFAULT_LANGUAGE && preferredLanguage !== DEFAULT_LANGUAGE) {
      setGoogleTranslateCookie(preferredLanguage);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || isOwnerDashboard) return;
    if (window.google?.translate) return;

    // ---- Google Translate × React DOM safety patch ----
    // Google Translate mutates the DOM by wrapping text nodes in <font> tags
    // and moving them around. React's virtual DOM reconciler then tries to
    // remove/insert nodes whose parent has silently changed, throwing:
    //   NotFoundError: Failed to execute 'removeChild' on 'Node': The node
    //   to be removed is not a child of this node.
    // The fix (https://github.com/facebook/react/issues/11538) is to make
    // removeChild / insertBefore no-op gracefully when the relationship has
    // been mutated externally. Patch once, globally.
    if (!window.__gtPatched) {
      window.__gtPatched = true;
      const proto = Node.prototype;
      const originalRemoveChild = proto.removeChild;
      proto.removeChild = function (child) {
        if (child && child.parentNode !== this) {
          // Silently ignore — Google Translate already moved it.
          if (child.parentNode) {
            try { return child.parentNode.removeChild(child); } catch (_) {}
          }
          return child;
        }
        return originalRemoveChild.apply(this, arguments);
      };
      const originalInsertBefore = proto.insertBefore;
      proto.insertBefore = function (newNode, referenceNode) {
        if (referenceNode && referenceNode.parentNode !== this) {
          // Reference node was moved away — fall back to append.
          try { return this.appendChild(newNode); } catch (_) {
            return newNode;
          }
        }
        return originalInsertBefore.apply(this, arguments);
      };
    }
    // ---- end patch ----

    window.googleTranslateElementInit = () => {
      if (!window.google?.translate) return;
      // Hidden widget instance needed for Google translate runtime.
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          autoDisplay: false,
          includedLanguages,
        },
        "google_translate_element"
      );
    };

    const existingScript = document.getElementById(GOOGLE_SCRIPT_ID);
    if (existingScript) return;

    const script = document.createElement("script");
    script.id = GOOGLE_SCRIPT_ID;
    script.src =
      "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    script.async = true;
    document.body.appendChild(script);
  }, [includedLanguages]);

  const handleChange = (event) => {
    const lang = event.target.value;
    if (!isSupportedLanguage(lang)) return;
    setSelectedLanguage(lang);
    persistSelectedLanguage(lang);
    // Google Translate sometimes appends a #googtrans(...) hash on its first
    // run. If we leave it in the URL the widget re-translates to whatever
    // the hash says, ignoring our cookie. Strip it before reloading.
    try {
      if (window.location.hash && /^#googtrans/i.test(window.location.hash)) {
        const cleanUrl =
          window.location.pathname + window.location.search;
        window.history.replaceState(null, "", cleanUrl);
      }
    } catch (_) {
      // best-effort, ignore
    }
    // Use a full navigation (not just reload) when returning to the source
    // language so the browser fetches a fresh, untranslated HTML response
    // instead of using the bf-cache copy that still has translated text.
    window.location.assign(
      window.location.pathname + window.location.search
    );
  };

  return (
    <>
      <div id="google_translate_element" className="hidden" aria-hidden />
      {!isOwnerDashboard && (
        <div className="language-switcher">
          <select
            id="site-language"
            value={selectedLanguage}
            onChange={handleChange}
            className="language-switcher__select notranslate"
            translate="no"
            aria-label="Select language"
          >
            {SUPPORTED_LANGUAGES.map((language) => (
              <option key={language.code} value={language.code}>
                {language.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </>
  );
}
