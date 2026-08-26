import { redirect } from "next/navigation";
import { DEFAULT_LOCALE, isLocale } from "@/lib/i18n";

export const dynamic = "force-dynamic";

/** Thai/rodizio page not used for Grill N Chill — send visitors to the location hub. */
export default async function AllYouCanEatLunchRedirect({ params }) {
  const { locale: raw } = await params;
  const locale = isLocale(raw) ? raw : DEFAULT_LOCALE;
  redirect(`/${locale}`);
}
