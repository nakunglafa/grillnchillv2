/** Supported public locales — English is default / x-default. */
export const LOCALES = ["en", "pt", "fr", "de", "nl", "es"];
export const DEFAULT_LOCALE = "en";

export const LOCALE_LABELS = {
  en: "English",
  pt: "Português",
  fr: "Français",
  de: "Deutsch",
  nl: "Nederlands",
  es: "Español",
};

export function isLocale(value) {
  return LOCALES.includes(String(value || "").toLowerCase());
}

/**
 * Pick best locale from Accept-Language header.
 * @param {string | null | undefined} header
 */
export function getLocaleFromAcceptLanguage(header) {
  if (!header || typeof header !== "string") return DEFAULT_LOCALE;
  const parts = header.split(",").map((raw) => {
    const [tag, ...params] = raw.trim().split(";");
    let q = 1;
    for (const p of params) {
      const m = p.trim().match(/^q=([0-9.]+)/i);
      if (m) q = parseFloat(m[1]) || 0;
    }
    const primary = String(tag || "")
      .trim()
      .toLowerCase()
      .split("-")[0];
    return { primary, q };
  });
  parts.sort((a, b) => b.q - a.q);
  for (const { primary } of parts) {
    if (isLocale(primary)) return primary;
  }
  return DEFAULT_LOCALE;
}

/**
 * Strip leading locale from pathname if present.
 * @param {string} pathname
 */
export function stripLocaleFromPathname(pathname) {
  const path = pathname || "/";
  const segments = path.split("/").filter(Boolean);
  if (segments.length && isLocale(segments[0])) {
    const rest = segments.slice(1).join("/");
    return rest ? `/${rest}` : "/";
  }
  return path.startsWith("/") ? path : `/${path}`;
}

/**
 * @param {string} locale
 * @param {string} path absolute path without locale, e.g. /intendente/menu
 */
export function localizedPath(locale, path = "/") {
  const loc = isLocale(locale) ? locale : DEFAULT_LOCALE;
  let clean = path || "/";
  if (!clean.startsWith("/")) clean = `/${clean}`;
  clean = stripLocaleFromPathname(clean);
  if (clean === "/") return `/${loc}`;
  return `/${loc}${clean}`;
}

/**
 * Build alternates.languages map for generateMetadata.
 * @param {string} siteUrl
 * @param {string} pathWithoutLocale
 */
export function buildHrefLangAlternates(siteUrl, pathWithoutLocale = "/") {
  const base = String(siteUrl || "").replace(/\/$/, "");
  const languages = {};
  for (const loc of LOCALES) {
    languages[loc] = `${base}${localizedPath(loc, pathWithoutLocale)}`;
  }
  languages["x-default"] = `${base}${localizedPath(DEFAULT_LOCALE, pathWithoutLocale)}`;
  return languages;
}

/**
 * Paths that must NOT be locale-prefixed.
 * @param {string} pathname
 */
export function isLocaleExemptPath(pathname) {
  const p = pathname || "/";
  if (
    p.startsWith("/owner") ||
    p.startsWith("/api") ||
    p.startsWith("/_next") ||
    p.startsWith("/print-agent") ||
    p === "/favicon.ico" ||
    p === "/robots.txt" ||
    p === "/sitemap.xml" ||
    p === "/llms.txt" ||
    p === "/ai.txt"
  ) {
    return true;
  }
  // Static files with extension
  if (/\.[a-zA-Z0-9]{2,8}$/.test(p)) return true;
  return false;
}
