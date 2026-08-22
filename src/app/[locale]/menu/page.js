import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";
import { getDefaultLocationSlug, menuPath } from "@/lib/restaurants";

/** Legacy flat /menu → default location menu (server redirect for SEO). */
export default async function MenuRedirectPage({ params }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  const slug = getDefaultLocationSlug();
  redirect(slug ? menuPath(slug, locale) : `/${locale}`);
}
