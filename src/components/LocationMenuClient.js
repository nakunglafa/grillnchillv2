"use client";

import Link from "next/link";
import { SyncActiveLocation } from "@/components/SyncActiveLocation";
import { MenuClient } from "@/components/MenuClient";

export function LocationMenuClient({
  catalog,
  restaurant,
  menus,
  specialMenuLists,
  error,
  backHref,
}) {
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
      <MenuClient restaurant={restaurant} menus={menus} specialMenuLists={specialMenuLists} />
    </>
  );
}
