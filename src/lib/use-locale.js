"use client";

import { useParams, usePathname } from "next/navigation";
import { DEFAULT_LOCALE, isLocale, localizedPath } from "@/lib/i18n";

/** Current public locale from route params or pathname. */
export function useLocale() {
  const params = useParams();
  const pathname = usePathname() || "/";
  const fromParams = params?.locale;
  if (isLocale(fromParams)) return fromParams;
  const first = pathname.split("/").filter(Boolean)[0];
  return isLocale(first) ? first : DEFAULT_LOCALE;
}

/** Prefixed href helper for the active locale. */
export function useLocalizedPath() {
  const locale = useLocale();
  return (path = "/") => localizedPath(locale, path);
}
