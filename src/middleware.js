import { NextResponse } from "next/server";
import {
  DEFAULT_LOCALE,
  isLocale,
  isLocaleExemptPath,
  stripLocaleFromPathname,
} from "@/lib/i18n";

export function middleware(request) {
  const { pathname } = request.nextUrl;

  if (isLocaleExemptPath(pathname)) {
    return NextResponse.next();
  }

  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];

  // Already locale-prefixed — pass through (and unwrap accidental /en/fr/...)
  if (isLocale(first)) {
    if (segments[1] && isLocale(segments[1])) {
      const url = request.nextUrl.clone();
      url.pathname =
        `/${segments[0]}/${segments.slice(2).join("/")}`.replace(/\/$/, "") ||
        `/${segments[0]}`;
      return NextResponse.redirect(url, 308);
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // Always prefix with the default locale. Do not negotiate Accept-Language:
  // a language-dependent 307 makes `/` an unstable redirect, which Google
  // reports as "Page with redirect" and will not index.
  const rest = stripLocaleFromPathname(pathname);
  const nextPath = rest === "/" ? `/${DEFAULT_LOCALE}` : `/${DEFAULT_LOCALE}${rest}`;

  if (nextPath === pathname) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = nextPath;

  // Google reads the site name from the domain root (https://grillnchill.pt/),
  // not from /en. A redirect here made Google skip our WebSite schema and keep
  // the old "Digital Lisbon" label. Serve the English homepage at / instead.
  if (pathname === "/") {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", nextPath);
    return NextResponse.rewrite(url, {
      request: { headers: requestHeaders },
    });
  }

  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
