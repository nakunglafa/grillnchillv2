import { NextResponse } from "next/server";
import {
  getLocaleFromAcceptLanguage,
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
      url.pathname = `/${segments[0]}/${segments.slice(2).join("/")}`.replace(/\/$/, "") || `/${segments[0]}`;
      return NextResponse.redirect(url);
    }
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", pathname);
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  const locale = getLocaleFromAcceptLanguage(request.headers.get("accept-language"));
  const rest = stripLocaleFromPathname(pathname);
  const nextPath = rest === "/" ? `/${locale}` : `/${locale}${rest}`;

  // Guard: never redirect to the same path (avoids ERR_TOO_MANY_REDIRECTS)
  if (nextPath === pathname) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = nextPath;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\..*).*)"],
};
