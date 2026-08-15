"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { LocationCategoryFavorites } from "@/components/LocationCategoryFavorites";
import { LocationGoogleReviews } from "@/components/LocationGoogleReviews";
import { SyncActiveLocation } from "@/components/SyncActiveLocation";
import { useRestaurant } from "@/context/RestaurantContext";
import { locationPath, menuPath, cakeOrderPath } from "@/lib/restaurants";
import { getNearbyPlaces } from "@/lib/nearby-copy";
import { getMessages, t } from "@/lib/messages";
import { useLocale, useLocalizedPath } from "@/lib/use-locale";
import { getBranchCopy } from "@/lib/branch-copy";

function formatSlotTime(timeStr, locale) {
  if (!timeStr || typeof timeStr !== "string") return "";
  const m = timeStr.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return timeStr.slice(0, 5);
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10) || 0;
  const mins = h * 60 + min;

  // Everyday phrasing: noon / midnight when exact
  if (mins === 0) return locale === "en" ? "midnight" : "00:00";
  if (mins === 12 * 60) return locale === "en" ? "noon" : "12:00";

  if (locale === "en") {
    const ampm = h >= 12 ? "PM" : "AM";
    const h12 = h % 12 || 12;
    return min === 0 ? `${h12} ${ampm}` : `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
  }
  return min === 0
    ? `${String(h).padStart(2, "0")}:00`
    : `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
}

function formatHoursRange(openStr, closeStr, locale, messages) {
  const open = formatSlotTime(openStr, locale);
  const close = formatSlotTime(closeStr, locale);
  if (!open || !close) return "";
  // 1 AM after overnight → prefer "1 AM"
  return t(messages, "location.hoursRange", "{open} – {close}", { open, close });
}

function OpeningHoursBlock({ slots, messages, locale }) {
  if (!Array.isArray(slots) || slots.length === 0) {
    return (
      <p className="text-sm text-white/55">{t(messages, "location.hoursSoon")}</p>
    );
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
        .map((s) => formatHoursRange(s.open_time, s.close_time, locale, messages))
        .filter(Boolean)
        .join(", ");
      return {
        dayKey: d,
        day: t(messages, `days.${d}`, d),
        times: times || t(messages, "common.closed"),
        timesKey: times || "__closed__",
      };
    });

  if (rows.length === 0) {
    return (
      <p className="text-sm text-white/55">{t(messages, "location.hoursSoon")}</p>
    );
  }

  // Collapse identical hours across all listed days → "Every day · 12 PM – 1 AM"
  const uniqueKeys = [...new Set(rows.map((r) => r.timesKey))];
  if (uniqueKeys.length === 1 && uniqueKeys[0] !== "__closed__") {
    const label =
      rows.length >= 7
        ? t(messages, "location.everyDay")
        : t(messages, "location.openDays", "{count} days a week", { count: rows.length });
    return (
      <div className="space-y-1 text-sm text-white/70">
        <p className="font-medium text-white/90">{label}</p>
        <p className="text-base text-white/75">{rows[0].times}</p>
      </div>
    );
  }

  // Group consecutive days with the same hours
  const groups = [];
  for (const row of rows) {
    const last = groups[groups.length - 1];
    if (last && last.timesKey === row.timesKey) {
      last.days.push(row.day);
      last.dayKeys.push(row.dayKey);
    } else {
      groups.push({
        days: [row.day],
        dayKeys: [row.dayKey],
        times: row.times,
        timesKey: row.timesKey,
      });
    }
  }

  return (
    <ul className="space-y-2 text-sm text-white/70">
      {groups.map((g) => {
        const dayLabel =
          g.days.length === 1
            ? g.days[0]
            : `${g.days[0]} – ${g.days[g.days.length - 1]}`;
        return (
          <li key={g.dayKeys.join("-")} className="flex justify-between gap-4 border-b border-white/5 pb-2">
            <span className="font-medium text-white/85">{dayLabel}</span>
            <span className="text-right text-white/60">{g.times}</span>
          </li>
        );
      })}
    </ul>
  );
}

function normalizeTestimonials(raw, guestLabel) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => ({
      id: item.id ?? i,
      name: item.reviewer_name || item.name || guestLabel,
      quote: item.quote || item.text || "",
    }))
    .filter((item) => item.quote);
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
  positioningHeadline = "",
  positioningIntro = "",
  venueLabelOverride = "",
}) {
  const router = useRouter();
  const locale = useLocale();
  const lp = useLocalizedPath();
  const messages = getMessages(locale);
  const { setActiveRestaurantId } = useRestaurant();
  const name = restaurant?.name || catalog.label;
  const address = restaurant?.address || catalog.addressFallback || "";
  const phone = restaurant?.phone || "";
  const email = restaurant?.email || "";
  const logoUrl = restaurant?.logo_url || restaurant?.logoUrl || catalog.logoUrl || "";
  const testimonials = normalizeTestimonials(
    restaurant?.testimonials,
    t(messages, "location.guest")
  );
  const nearby = getNearbyPlaces(catalog.slug, locale);
  const isBakery = catalog.venueType === "bakery";
  const cakeOrderHref = cakeOrderPath(catalog, locale);
  const venueEyebrow =
    venueLabelOverride || catalog.venueLabel || (isBakery ? "Bakery & café" : "Restaurant");
  const heroImage =
    featureImage ||
    logoUrl ||
    (process.env.NEXT_PUBLIC_HERO_COLLAGE_MAIN || "").trim() ||
    "";
  const introText =
    positioningIntro ||
    t(
      messages,
      isBakery ? "location.bakeryFallbackIntro" : "location.restaurantFallbackIntro"
    );
  const headline = positioningHeadline || "";

  function goBook() {
    setActiveRestaurantId(catalog.id);
    router.push(lp("/book"));
  }

  function goOrderCake() {
    setActiveRestaurantId(catalog.id);
    router.push(cakeOrderHref);
  }

  return (
    <div className="min-h-screen bg-[#0a0908] text-white">
      <SyncActiveLocation restaurantId={catalog.id} />
      <Header variant="marketing" />

      <section className="relative isolate overflow-hidden border-b border-white/10">
        {heroImage ? (
          <div
            className="absolute inset-0 bg-cover bg-center opacity-70"
            style={{ backgroundImage: `url(${heroImage})` }}
            aria-hidden
          />
        ) : (
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(197,157,95,0.18),transparent_55%)]"
            aria-hidden
          />
        )}
        <div
          className="absolute inset-0 bg-linear-to-b from-[color:var(--site-header-bg-solid)]/55 via-[#0a0908]/50 to-[#0a0908]"
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
          {headline ? (
            <p className="mt-3 max-w-2xl font-display text-xl text-accent/95 sm:text-2xl">{headline}</p>
          ) : null}
          <p className="mt-4 max-w-xl text-white/70">{introText}</p>
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
              {isBakery ? t(messages, "location.shopCakes", "Shop cakes") : t(messages, "location.viewMenu")}
            </Link>
            {isBakery ? (
              <button
                type="button"
                onClick={goOrderCake}
                className="rounded-md border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 hover:border-white/50"
              >
                {t(messages, "location.orderCustomCake", "Order a custom cake")}
              </button>
            ) : (
              <button
                type="button"
                onClick={goBook}
                className="rounded-md border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 hover:border-white/50"
              >
                {t(messages, "location.reserveTable")}
              </button>
            )}
            <Link
              href={`${lp("/")}#locations`}
              className="rounded-md px-4 py-2.5 text-sm font-semibold text-white/60 hover:text-white"
            >
              {t(messages, "location.allLocations")}
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
              {storyTitle || t(messages, "location.historyFallback")}
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
              {t(messages, "location.testimonialsTitle")}
            </h2>
            <p className="mt-2 text-sm text-white/60">{t(messages, "location.testimonialsIntro")}</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {testimonials.map((item) => (
                <li
                  key={item.id}
                  className="rounded-xl border border-white/10 bg-white/5 p-5"
                >
                  <p className="text-sm leading-relaxed text-white/75">&ldquo;{item.quote}&rdquo;</p>
                  <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-accent">
                    {item.name}
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
            {t(messages, "location.detailsTitle")}
          </h2>
          <div className="mt-6 grid gap-10 sm:grid-cols-2">
            <div className="space-y-4">
              {address ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {t(messages, "location.address")}
                  </p>
                  <p className="mt-1 text-sm text-white/75">{address}</p>
                </div>
              ) : null}
              {phone ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {t(messages, "location.phone")}
                  </p>
                  <p className="mt-1 text-sm text-white/75">
                    <a href={`tel:${phone.replace(/\s+/g, "")}`} className="hover:text-accent">
                      {phone}
                    </a>
                  </p>
                </div>
              ) : null}
              {email ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                    {t(messages, "location.email")}
                  </p>
                  <p className="mt-1 text-sm text-white/75">
                    <a href={`mailto:${email}`} className="hover:text-accent">
                      {email}
                    </a>
                  </p>
                </div>
              ) : null}
            </div>
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-accent">
                {t(messages, "location.hours")}
              </p>
              <OpeningHoursBlock slots={openingSlots} messages={messages} locale={locale} />
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
              {t(messages, "location.nearbyTitle", { name: catalog.shortLabel })}
            </h2>
            <p className="mt-2 max-w-xl text-sm text-white/60">
              {t(messages, "location.nearbyIntro", { venue: name })}
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
                    {t(messages, "location.openInMaps")}
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
              {t(messages, "location.eventsEyebrow")}
            </p>
            <h2 id="events-heading" className="mt-2 font-display text-2xl font-semibold sm:text-3xl">
              {t(messages, "location.eventsTitle")}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/70">
              {t(messages, "location.eventsBody")}
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {phone ? (
                <a
                  href={`tel:${phone.replace(/\s+/g, "")}`}
                  className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-wood-950 hover:bg-accent-hover"
                >
                  {t(messages, "location.callEnquire")}
                </a>
              ) : null}
              {email ? (
                <a
                  href={`mailto:${email}?subject=${encodeURIComponent(t(messages, "location.eventEmailSubject"))}`}
                  className="rounded-md border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 hover:border-white/50"
                >
                  {t(messages, "location.emailUs")}
                </a>
              ) : null}
              <button
                type="button"
                onClick={goBook}
                className="rounded-md border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 hover:border-white/50"
              >
                {t(messages, "location.reserveTable")}
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {otherLocations?.length > 0 ? (
        <section className="border-b border-white/10 py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6">
            <h2 className="font-display text-2xl font-semibold">
              {t(messages, "location.otherLocations")}
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {otherLocations.filter(Boolean).map((loc) => {
                const branch = getBranchCopy(loc.slug, locale);
                return (
                  <Link
                    key={loc.id}
                    href={locationPath(loc, locale)}
                    onClick={() => setActiveRestaurantId(loc.id)}
                    className="rounded-xl border border-white/10 bg-white/5 p-5 transition hover:border-accent/40"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">
                      {branch?.venueLabel || loc.venueLabel || loc.shortLabel}
                    </p>
                    <p className="mt-1 font-display text-xl font-semibold">{loc.label}</p>
                    <p className="mt-2 text-sm text-white/50">
                      {t(messages, "location.menuArrow")} {menuPath(loc, locale).replace(/^\//, "")}
                    </p>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="py-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <div>
            <h2 className="font-display text-2xl font-semibold">
              {isBakery
                ? t(messages, "location.orderCakesTitle", "Order cakes")
                : t(messages, "location.reserveYourTable")}
            </h2>
            <p className="mt-1 text-sm text-white/60">
              {isBakery
                ? t(messages, "location.orderCakesBody", "Shop ready-made cakes and pastries, or request a custom cake for pickup.")
                : t(messages, "location.reserveBody")}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href={menuHref}
              className="rounded-md border border-white/25 px-4 py-2.5 text-sm font-semibold text-white/90 hover:border-white/50"
            >
              {isBakery ? t(messages, "location.shopCakes", "Shop cakes") : t(messages, "nav.menu")}
            </Link>
            {isBakery ? (
              <button
                type="button"
                onClick={goOrderCake}
                className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-wood-950 hover:bg-accent-hover"
              >
                {t(messages, "location.orderCustomCakeShort", "Custom cake")}
              </button>
            ) : (
              <button
                type="button"
                onClick={goBook}
                className="rounded-md bg-accent px-4 py-2.5 text-sm font-semibold text-wood-950 hover:bg-accent-hover"
              >
                {t(messages, "location.reserveShort")}
              </button>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
