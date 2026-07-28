"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useRestaurant } from "@/context/RestaurantContext";
import { locationPath } from "@/lib/restaurants";

const BRAND =
  process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
  process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
  "Grill N Chill";

const HERO_IMAGE =
  process.env.NEXT_PUBLIC_HERO_COLLAGE_MAIN ||
  "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1600&q=80";

export default function HomePage() {
  const { restaurants, setActiveRestaurantId, hydrated } = useRestaurant();

  return (
    <div className="min-h-screen bg-[#0a0908] text-white">
      <Header variant="overlay" />

      <section className="relative isolate min-h-[78vh] overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${HERO_IMAGE})` }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-linear-to-b from-black/55 via-black/45 to-[#0a0908]" aria-hidden />
        <div className="relative mx-auto flex min-h-[78vh] max-w-6xl flex-col justify-end px-4 pb-16 pt-28 sm:px-6 sm:pb-20">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-accent">Lisbon</p>
          <h1 className="font-display text-5xl font-semibold tracking-tight text-white sm:text-7xl">
            {BRAND}
          </h1>
          <p className="mt-4 max-w-xl text-base text-white/75 sm:text-lg">
            Two Lisbon restaurants for lunch and dinner, plus a bakery café — pick a location to
            order, browse the menu, or book a table.
          </p>
        </div>
      </section>

      <section id="locations" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Our locations</h2>
          <p className="mt-3 text-white/65">
            Praça do Chile and Intendente are full lunch &amp; dinner restaurants. Bakery is our café.
            Open a branch for details, menu and booking.
          </p>
        </div>

        {!hydrated ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {restaurants.map((location) => (
              <article
                key={location.id}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm transition hover:border-accent/40 hover:bg-white/8"
              >
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">
                    {location.venueLabel || location.shortLabel}
                  </p>
                  <h3 className="mt-2 font-display text-2xl font-semibold text-white">
                    <Link
                      href={locationPath(location)}
                      className="hover:text-accent transition-colors"
                      onClick={() => setActiveRestaurantId(location.id)}
                    >
                      {location.name || location.label}
                    </Link>
                  </h3>
                  {location.address ? (
                    <p className="mt-3 text-sm leading-relaxed text-white/60">{location.address}</p>
                  ) : (
                    <p className="mt-3 text-sm text-white/45">Address coming soon</p>
                  )}
                  {location.phone ? (
                    <p className="mt-2 text-sm text-white/55">{location.phone}</p>
                  ) : null}
                </div>
                <div className="mt-8">
                  <Link
                    href={locationPath(location)}
                    onClick={() => setActiveRestaurantId(location.id)}
                    className="inline-flex rounded-full border border-white/25 px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-white/90 transition hover:border-white/50"
                  >
                    Open location
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
