"use client";

import Link from "next/link";
import { SyncActiveLocation } from "@/components/SyncActiveLocation";
import { MenuClient } from "@/components/MenuClient";
import { cakeOrderPath } from "@/lib/restaurants";
import { getMessages, t } from "@/lib/messages";
import { useLocale } from "@/lib/use-locale";

export function LocationMenuClient({
  catalog,
  restaurant,
  menus,
  specialMenuLists,
  error,
  backHref,
}) {
  const locale = useLocale();
  const messages = getMessages(locale);
  const isBakery = catalog?.venueType === "bakery";
  const customCakeHref = isBakery ? cakeOrderPath(catalog, locale) : null;

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0908] text-white">
        <SyncActiveLocation restaurantId={catalog.id} />
        <div className="mx-auto flex min-h-[50vh] max-w-lg flex-col items-center justify-center gap-4 px-4 text-center">
          <p className="text-white/80">{error}</p>
          <Link href={backHref} className="text-sm font-semibold text-accent hover:text-accent-hover">
            ← Back to {catalog.shortLabel}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <SyncActiveLocation restaurantId={catalog.id} />
      <div className="border-b border-white/10 bg-[color:var(--site-header-bg-solid)] px-4 py-2 text-center sm:text-left">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <Link
            href={backHref}
            className="text-xs font-semibold uppercase tracking-wide text-white/70 hover:text-accent"
          >
            ← {catalog.shortLabel || catalog.label}
          </Link>
          <p className="text-xs text-white/50">
            Menu for {restaurant?.name || catalog.label}
          </p>
        </div>
      </div>
      {isBakery && customCakeHref ? (
        <div className="border-b border-accent/30 bg-accent/10 px-4 py-3">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-white/85">
              {t(
                messages,
                "menu.customCakeBanner",
                "Need a custom cake? Request one for pickup (48h notice)."
              )}
            </p>
            <Link
              href={customCakeHref}
              className="text-sm font-semibold text-accent hover:text-accent-hover"
            >
              {t(messages, "menu.customCakeCta", "Order a custom cake")} →
            </Link>
          </div>
        </div>
      ) : null}
      <MenuClient restaurant={restaurant} menus={menus} specialMenuLists={specialMenuLists} />
    </>
  );
}
