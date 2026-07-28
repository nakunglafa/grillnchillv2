"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { LocationCategoryFavorites } from "@/components/LocationCategoryFavorites";
import { LocationGoogleReviews } from "@/components/LocationGoogleReviews";
import { SyncActiveLocation } from "@/components/SyncActiveLocation";
import { useRestaurant } from "@/context/RestaurantContext";
import { locationPath, menuPath } from "@/lib/restaurants";

function formatSlotTime(t) {
  if (!t || typeof t !== "string") return "";
  const m = t.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return t.slice(0, 5);
  let h = parseInt(m[1], 10);
  const min = m[2];
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${min} ${ampm}`;
}

function OpeningHoursBlock({ slots }) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return <p className="text-sm text-white/55">Opening hours coming soon.</p>;
  }

  const byDay = {};
  for (const slot of slots) {
    const day = (slot.day_of_week || slot.day || "").toString().toLowerCase();
    if (!day) continue;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(slot);
  }

  const order = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const rows = order
    .filter((d) => byDay[d]?.length)
    .map((d) => {
      const times = byDay[d]
        .map((s) => {
          const a = formatSlotTime(s.open_time);
          const b = formatSlotTime(s.close_time);
          if (a && b) return `${a} – ${b}`;
          return null;
        })
        .filter(Boolean)
        .join(", ");
      return { day: d.charAt(0).toUpperCase() + d.slice(1), times: times || "Closed" };
    });

  if (rows.length === 0) {
    return <p className="text-sm text-white/55">Opening hours coming soon.</p>;
  }

  return (
    <ul className="space-y-1.5 text-sm text-white/70">
      {rows.map((r) => (
        <li key={r.day} className="flex justify-between gap-4 border-b border-white/5 pb-1.5">
          <span className="font-medium text-white/85">{r.day}</span>
          <span className="text-right text-white/60">{r.times}</span>
        </li>
      ))}
    </ul>
  );
}

function normalizeTestimonials(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((t, i) => ({
      id: t.id ?? i,
      name: t.reviewer_name || t.name || "Guest",
      quote: t.quote || t.text || "",
    }))
    .filter((t) => t.quote);
}

export function LocationPageClient({
  catalog,
  restaurant,
  openingSlots,
  favorites,
  otherLocations,
  menuHref,
  featureImage = "",
  storyTitle = "",
  storyText = "",
}) {
  const router = useRouter();
  const { setActiveRestaurantId } = useRestaurant();
  const name = restaurant?.name || catalog.label;
  const address = restaurant?.address || catalog.addressFallback || "";
  const phone = restaurant?.phone || "";
  const email = restaurant?.email || "";
  const logoUrl = restaurant?.logo_url || restaurant?.logoUrl || catalog.logoUrl || "";
  const testimonials = normalizeTestimonials(restaurant?.testimonials);
  const nearby = Array.isArray(catalog.nearbyFallback) ? catalog.nearbyFallback : [];
  const isBakery = catalog.venueType === "bakery";
  const venueEyebrow = catalog.venueLabel || (isBakery ? "Bakery & café" : "Restaurant");
  const heroImage =
    featureImage ||
    process.env.NEXT_PUBLIC_HERO_COLLAGE_MAIN ||
    "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=1600&q=80";

  function goBook() {
    setActiveRestaurantId(catalog.id);
    router.push("/book");
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-white">
      <SyncActiveLocation restaurantId={catalog.id} />
      <Header variant="marketing" />

      <section className="relative isolate overflow-hidden border-b border-white/10">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: `url(${heroImage})` }}
          aria-hidden
        />
        <div
          className="absolute inset-0 bg-linear-to-b from-[color:var(--site-header-bg-solid)] via-[#0a0908]/85 to-[#0a0908]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
            {venueEyebrow} · {catalog.shortLabel}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt=""
                className="h-14 w-14 rounded-full object-cover ring-1 ring-white/20"
              />
            ) : null}
            <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">{name}</h1>
          </div>
          <p className="mt-4 max-w-xl text-white/70">
            {isBakery
              ? "Café and bakery — coffee, pastries and light bites in Lisbon."
              : "Lunch and dinner restaurant in Lisbon — grill, share plates and a full evening menu."}
          </p>
          {address ? <p className="mt-3 max-w-xl text-sm text-white/55">{address}</p> : null}
          {phone ? (
            <p className="mt-2 text-sm text-white/55">
              <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-accent">
                {phone}
              </a>
            </p>
          ) : null}
          <div className="mt-8 flex flex-wrap gap-2">
            <Link
              href={menuHref}
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-wood-950 hover:bg-accent-hover"
            >
              View full menu
            </Link>
            <button
              type="button"
              onClick={goBook}
              className="rounded-md border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 hover:border-white/50"
            >
              {isBakery ? "Book a visit" : "Reserve a table"}
            </button>
            <Link
              href="/#locations"
              className="rounded-md px-4 py-2.5 text-sm font-semibold text-white/60 hover:text-white"
            >
              All locations
            </Link>
          </div>
        </div>
      </section>

      {storyText ? (
        <section
          id="history"
          className="border-b border-white/10 py-12"
          aria-labelledby="history-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="history-heading" className="font-display text-2xl font-semibold sm:text-3xl">
              {storyTitle || "Our history"}
            </h2>
            <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-relaxed text-white/70 sm:text-base">
              {storyText}
            </p>
          </div>
        </section>
      ) : null}

      <LocationGoogleReviews slug={catalog.slug} venueName={name} />

      {testimonials.length > 0 ? (
        <section
          id="testimonials"
          className="border-b border-white/10 py-12"
          aria-labelledby="testimonials-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="testimonials-heading" className="font-display text-2xl font-semibold sm:text-3xl">
              Guest testimonials
            </h2>
            <p className="mt-2 text-sm text-white/60">Words from people who’ve dined with us.</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((t) => (
                <li
                  key={t.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-5"
                >
                  <p className="text-sm leading-relaxed text-white/75">&ldquo;{t.quote}&rdquo;</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent">
                    {t.name}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      <section id="details" className="border-b border-white/10 py-12" aria-labelledby="details-heading">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <h2 id="details-heading" className="font-display text-2xl font-semibold sm:text-3xl">
            Details
          </h2>
          <div className="mt-6 grid gap-10 sm:grid-cols-2">
            <div className="space-y-4">
              {address ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Address</p>
                  <p className="mt-1 text-sm text-white/75">{address}</p>
                </div>
              ) : null}
              {phone ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Phone</p>
                  <p className="mt-1 text-sm text-white/75">
                    <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-accent">
                      {phone}
                    </a>
                  </p>
                </div>
              ) : null}
              {email ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">Email</p>
                  <p className="mt-1 text-sm text-white/75">
                    <a href={`mailto:${email}`} className="hover:text-accent">
                      {email}
                    </a>
                  </p>
                </div>
              ) : null}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">Hours</p>
              <OpeningHoursBlock slots={openingSlots} />
            </div>
          </div>
        </div>
      </section>

      <LocationCategoryFavorites
        categories={favorites}
        venueName={name}
        menuHref={menuHref}
      />

      {nearby.length > 0 ? (
        <section id="nearby" className="border-b border-white/10 py-12" aria-labelledby="nearby-heading">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 id="nearby-heading" className="font-display text-2xl font-semibold sm:text-3xl">
              Near {catalog.shortLabel}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/60">
              Landmarks and neighbourhood spots a short walk from {name}.
            </p>
            <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {nearby.map((place) => (
                <li key={place.name} className="border-t border-white/10 pt-4">
                  <h3 className="text-lg font-semibold text-white">{place.name}</h3>
                  <p className="mt-2 text-sm text-white/60">{place.blurb}</p>
                  <a
                    href={place.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex text-sm font-semibold text-accent hover:text-accent-hover"
                  >
                    Open in Maps →
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}

      {catalog.offersPrivateEvents ? (
        <section
          id="events"
          className="border-b border-white/10 bg-white/[0.03] py-12"
          aria-labelledby="events-heading"
        >
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-accent">
              Praça do Chile
            </p>
            <h2 id="events-heading" className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              Private events &amp; group dining
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
              Host lunch or dinner gatherings at Grill N Chill Praça do Chile — birthdays, team meals
              and private dining for groups. Call us to plan your event, or reserve a table online.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-wood-950 hover:bg-accent-hover"
                >
                  Call to enquire
                </a>
              ) : null}
              {email ? (
                <a
                  href={`mailto:${email}?subject=${encodeURIComponent("Private event enquiry — Praça do Chile")}`}
                  className="rounded-md border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 hover:border-white/50"
                >
                  Email us
                </a>
              ) : null}
              <button
                type="button"
                onClick={goBook}
                className="rounded-md border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 hover:border-white/50"
              >
                Reserve a table
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {otherLocations?.length > 0 ? (
        <section className="border-b border-white/10 py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-semibold">Other locations</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {otherLocations.filter(Boolean).map((loc) => (
                <Link
                  key={loc.id}
                  href={locationPath(loc)}
                  onClick={() => setActiveRestaurantId(loc.id)}
                  className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-accent/40"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                    {loc.venueLabel || loc.shortLabel}
                  </p>
                  <p className="mt-1 font-display text-xl font-semibold">{loc.label}</p>
                  <p className="mt-2 text-sm text-white/50">
                    Menu → {menuPath(loc).replace(/^\//, "")}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {isBakery ? "Visit the bakery" : "Reserve your table"}
            </h2>
            <p className="mt-1 text-sm text-white/60">
              {isBakery
                ? "Stop by for coffee and fresh pastry, or check the menu first."
                : "Book lunch or dinner at this Grill N Chill restaurant."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={menuHref}
              className="rounded-md border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 hover:border-white/50"
            >
              Menu
            </Link>
            <button
              type="button"
              onClick={goBook}
              className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-wood-950 hover:bg-accent-hover"
            >
              {isBakery ? "Book" : "Reserve"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
