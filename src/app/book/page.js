"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { getRestaurant, createReservation, getAvailability } from "@/lib/api";

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || "9";

/** Left column visual — match homepage hero; override with NEXT_PUBLIC_BOOK_PAGE_IMAGE */
const BOOK_PAGE_IMAGE =
  process.env.NEXT_PUBLIC_BOOK_PAGE_IMAGE ||
  process.env.NEXT_PUBLIC_PARALLAX_RESERVE_BG ||
  process.env.NEXT_PUBLIC_HERO_COLLAGE_MAIN ||
  "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80";

const DAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** Get day_of_week string for a date (YYYY-MM-DD) */
function getDayOfWeekForDate(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return DAY_NAMES[date.getDay()];
}

/** Check if the restaurant is open on this day (has at least one slot with open/close times) */
function isDayOpen(openingSlots, dateStr) {
  if (!openingSlots || openingSlots.length === 0) return true; // no data = show all
  const day = getDayOfWeekForDate(dateStr);
  const daySlots = openingSlots.filter((s) => (s.day_of_week || "").toLowerCase() === day);
  return daySlots.some(
    (s) =>
      (s.open_time && s.close_time) ||
      (s.open_time_2 && s.close_time_2) ||
      (s.second_open && s.second_close)
  );
}

/** Full-day time slots (8:00–23:00, every 30 min) for the time panel */
const FULL_DAY_TIME_SLOTS = (() => {
  const slots = [];
  for (let h = 8; h <= 23; h++) {
    slots.push(`${String(h).padStart(2, "0")}:00`);
    if (h < 23) slots.push(`${String(h).padStart(2, "0")}:30`);
  }
  return slots;
})();

/** Parse time string "HH:mm" or "HH:mm:ss" to minutes */
function parseTimeToMinutes(str) {
  if (!str || typeof str !== "string") return 0;
  const parts = str.trim().split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  return Number.isNaN(h) ? 0 : h * 60 + m;
}

/** Get time slots for the day from opening hours — supports multiple slots per day (e.g. lunch + dinner) and alternate fields (open_time_2, close_time_2) */
function getTimeSlotsForDay(openingSlots, dateStr) {
  if (!openingSlots || openingSlots.length === 0) return FULL_DAY_TIME_SLOTS;
  const day = getDayOfWeekForDate(dateStr);
  const daySlots = openingSlots.filter((s) => (s.day_of_week || "").toLowerCase() === day);
  if (daySlots.length === 0) return FULL_DAY_TIME_SLOTS;
  const minuteSet = new Set();
  daySlots.forEach((s) => {
    const ranges = [];
    if (s.open_time && s.close_time) ranges.push([s.open_time, s.close_time]);
    if (s.open_time_2 && s.close_time_2) ranges.push([s.open_time_2, s.close_time_2]);
    if (s.second_open && s.second_close) ranges.push([s.second_open, s.second_close]);
    ranges.forEach(([openStr, closeStr]) => {
      const openMinutes = parseTimeToMinutes(openStr);
      const closeMinutes = parseTimeToMinutes(closeStr);
      const startMinutes = Math.ceil(openMinutes / 30) * 30;
      for (let m = startMinutes; m < closeMinutes; m += 30) {
        if (m >= 0 && m < 24 * 60) minuteSet.add(m);
      }
    });
  });
  const fromSlots = Array.from(minuteSet)
    .sort((a, b) => a - b)
    .map((m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  return fromSlots.length > 0 ? fromSlots : FULL_DAY_TIME_SLOTS;
}

/** Next 7 days, filtered to open days only */
function buildDateOptions(days = 7, openingSlots) {
  const options = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const formatter = new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" });
  let added = 0;
  for (let i = 0; added < days && i < 14; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const dayNum = String(d.getDate()).padStart(2, "0");
    const value = `${y}-${m}-${dayNum}`;
    if (!isDayOpen(openingSlots, value)) continue;
    options.push({
      value,
      label: formatter.format(d),
      isToday: i === 0,
    });
    added++;
  }
  return options;
}

const PARTY_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function getBookingParallaxImageFromRestaurant(restaurant) {
  const content =
    restaurant?.website_content ??
    restaurant?.content_json ??
    null;
  const src =
    content?.parallax_reserve_bg_url ??
    content?.parallaxReserveBg ??
    "";
  return typeof src === "string" && src.trim() ? src.trim() : "";
}

function BookPageImageColumn({ alt = "Restaurant", src = BOOK_PAGE_IMAGE }) {
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
  }, [src]);

  return (
    <div className="relative aspect-[5/3] max-h-[240px] w-full shrink-0 overflow-hidden rounded-sm border border-white/10 sm:aspect-[2/1] sm:max-h-[280px] lg:aspect-auto lg:h-full lg:min-h-0 lg:max-h-none lg:w-full lg:self-stretch">
      {!imageLoaded ? (
        <div className="absolute inset-0 animate-pulse bg-white/10" aria-hidden />
      ) : null}
      <img
        key={src || BOOK_PAGE_IMAGE}
        src={src || BOOK_PAGE_IMAGE}
        alt={alt}
        onLoad={() => setImageLoaded(true)}
        onError={() => setImageLoaded(true)}
        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
          imageLoaded ? "opacity-100" : "opacity-0"
        }`}
        sizes="(max-width: 1024px) 100vw, 50vw"
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#0a0908]/90 via-[#0a0908]/15 to-transparent lg:bg-gradient-to-r lg:from-transparent lg:via-transparent lg:to-[#0a0908]/65"
        aria-hidden
      />
    </div>
  );
}

export default function BookPage() {
  const { user, token, isAuthenticated } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [openingSlots, setOpeningSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availabilitySlots, setAvailabilitySlots] = useState(null);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reservationConfigMissing, setReservationConfigMissing] = useState(false);
  
  const [reservation_date, setReservation_date] = useState("");
  const [reservation_time, setReservation_time] = useState("12:00");
  const [party_size, setParty_size] = useState(2);
  const [customer_name, setCustomer_name] = useState("");
  const [confirmation_phone, setConfirmation_phone] = useState("");
  const [customer_email, setCustomer_email] = useState("");
  const [notes, setNotes] = useState("");
  const [reservationResult, setReservationResult] = useState(null);
  /** 1 = date/time/guests, 2 = contact & confirm */
  const [bookStep, setBookStep] = useState(1);
  const bookingParallaxImage = useMemo(
    () => getBookingParallaxImageFromRestaurant(restaurant) || BOOK_PAGE_IMAGE,
    [restaurant]
  );

  useEffect(() => {
    getRestaurant(RESTAURANT_ID)
      .then((data) => {
        setRestaurant(data?.restaurant ?? null);
        setOpeningSlots(data?.opening_hours?.opening_slots ?? []);
      })
      .catch(() => {
        setRestaurant(null);
        setOpeningSlots([]);
      })
      .finally(() => setLoading(false));
  }, []);

  // Default date to today (client-only)
  useEffect(() => {
    if (!reservation_date) {
      const t = new Date();
      setReservation_date(
        `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`
      );
    }
  }, []);

  const dateOptions = useMemo(() => buildDateOptions(7, openingSlots), [openingSlots]);

  // If current date is a closed day, switch to first open day
  useEffect(() => {
    if (dateOptions.length > 0 && reservation_date && !dateOptions.some((o) => o.value === reservation_date)) {
      setReservation_date(dateOptions[0].value);
    }
  }, [dateOptions, reservation_date]);

  // Fetch available time slots from API (date + party_size)
  useEffect(() => {
    if (!reservation_date || !party_size) {
      setAvailabilitySlots(null);
      return;
    }
    setAvailabilityLoading(true);
    setAvailabilitySlots(null);
    getAvailability(RESTAURANT_ID, {
      date: reservation_date,
      party_size: Number(party_size),
    })
      .then((data) => {
        setReservationConfigMissing(false);
        const raw = data?.available_slots ?? [];
        const normalized = raw.map((t) => {
          if (typeof t !== "string") return t;
          const trimmed = t.replace(/\.\d+Z?$/i, "").trim();
          const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
          return match ? `${String(parseInt(match[1], 10)).padStart(2, "0")}:${match[2]}` : trimmed.slice(0, 5);
        });
        setAvailabilitySlots(normalized);
      })
      .catch((err) => {
        if (err?.data?.code === "reservation_config_missing") {
          setReservationConfigMissing(true);
        } else {
          setReservationConfigMissing(false);
        }
        setAvailabilitySlots([]);
      })
      .finally(() => setAvailabilityLoading(false));
  }, [reservation_date, party_size]);

  useEffect(() => {
    if (user) {
      setCustomer_name(user.name ?? "");
      setCustomer_email(user.email ?? "");
    }
  }, [user]);

  // Guests can book; they must provide name and at least one of phone or email.

  function validateGuestContact() {
    const nameOk = (customer_name || "").trim().length > 0;
    const hasPhone = (confirmation_phone || "").trim().length > 0;
    const hasEmail = (customer_email || "").trim().length > 0;
    if (!nameOk) {
      setError("Please enter your name.");
      return false;
    }
    if (!isAuthenticated && !hasPhone && !hasEmail) {
      setError("As a guest, please provide at least your phone number or email.");
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (bookStep !== 2) return;
    setError("");
    if (!validateGuestContact()) return;
    setSubmitting(true);
    try {
      const body = {
        restaurant_id: Number(RESTAURANT_ID),
        reservation_date,
        reservation_time,
        party_size: Number(party_size),
        customer_name: (customer_name || "").trim(),
        confirmation_phone: (confirmation_phone || "").trim() || undefined,
        customer_email: (customer_email || "").trim() || undefined,
        notes: (notes || "").trim() || undefined,
      };
      const data = await createReservation(token || undefined, body);
      const reservation = data?.data ?? data;
      setReservationResult(reservation);
    } catch (err) {
      if (err?.data?.code === "reservation_config_missing") {
        setReservationConfigMissing(true);
      }
      setError(
        err?.data?.message ||
        (err?.data?.errors ? Object.values(err.data.errors).flat().join(" ") : null) ||
        err?.message ||
        "Failed to create reservation"
      );
    } finally {
      setSubmitting(false);
    }
  }

  const timeSlotsForDay = useMemo(
    () => getTimeSlotsForDay(openingSlots, reservation_date || ""),
    [openingSlots, reservation_date]
  );

  // Always show all time slots for the day (both lunch and dinner etc.); use API to mark which are bookable
  const timeSlotsToShow = timeSlotsForDay;
  const availableSlotsSet = useMemo(() => {
    if (!availabilitySlots || availabilitySlots.length === 0) return null;
    return new Set(
      availabilitySlots.map((t) => {
        const s = typeof t === "string" ? t.replace(/\.\d+Z?$/i, "").trim() : "";
        const match = s.match(/^(\d{1,2}):(\d{2})/);
        return match ? `${String(parseInt(match[1], 10)).padStart(2, "0")}:${match[2]}` : s.slice(0, 5);
      })
    );
  }, [availabilitySlots]);

  const isToday = reservation_date && (() => {
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return reservation_date === `${y}-${m}-${d}`;
  })();
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isTimeSlotPast = (slot) => {
    if (!isToday) return false;
    const [h, m] = slot.split(":").map(Number);
    return h * 60 + m <= currentMinutes;
  };
  const isSlotUnavailable = (slot) =>
    party_size >= 10 && availableSlotsSet !== null && !availableSlotsSet.has(slot);

  // Keep selected time on a bookable slot when date, slots, or party size change
  useEffect(() => {
    if (!reservation_date || timeSlotsToShow.length === 0) return;
    const selectable = timeSlotsToShow.filter((s) => !isTimeSlotPast(s) && !isSlotUnavailable(s));
    if (selectable.length === 0) return;
    if (!selectable.includes(reservation_time)) {
      setReservation_time(selectable[0]);
    }
  }, [
    reservation_date,
    timeSlotsToShow,
    reservation_time,
    party_size,
    availableSlotsSet,
    isToday,
    currentMinutes,
  ]);

  const whenSummaryLine = useMemo(() => {
    const opt = dateOptions.find((o) => o.value === reservation_date);
    const datePart = opt?.label ?? reservation_date ?? "—";
    return `${datePart} · ${reservation_time ?? "—"} · ${party_size} ${party_size === 1 ? "guest" : "guests"}`;
  }, [dateOptions, reservation_date, reservation_time, party_size]);

  function goToStep2() {
    setError("");
    if (reservationConfigMissing) {
      setError("Reservations are not available yet. Please try again later.");
      return;
    }
    if (!reservation_date?.trim()) {
      setError("Please choose a date.");
      return;
    }
    if (availabilityLoading) {
      setError("Loading available times…");
      return;
    }
    if (timeSlotsToShow.length === 0) {
      setError("No times available for this day.");
      return;
    }
    const selectable = timeSlotsToShow.filter((s) => !isTimeSlotPast(s) && !isSlotUnavailable(s));
    if (selectable.length === 0) {
      setError("No bookable times for this selection. Try another date or party size.");
      return;
    }
    if (!selectable.includes(reservation_time)) {
      setError("Please choose a valid time.");
      return;
    }
    setBookStep(2);
  }

  if (loading || !restaurant) {
    return (
      <div className="relative min-h-screen bg-[#0a0908] text-white">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[min(40vh,420px)] bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,rgba(197,157,95,0.09),transparent_55%)]"
          aria-hidden
        />
        <Header variant="marketing" />
        <main className="relative z-10 w-full px-4 py-6 pb-12 sm:px-6 md:py-8 lg:px-8 xl:px-12">
          <div className="mx-auto grid max-w-[1280px] content-start items-start gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8 xl:gap-10">
            <BookPageImageColumn alt="Restaurant" />
            <div className="w-full border border-white/10 bg-white/[0.03] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm sm:p-5">
              <div className="h-3 w-24 animate-pulse bg-white/15" />
              <div className="mt-3 h-7 w-44 animate-pulse bg-white/12 sm:h-8 sm:w-56" />
              <div className="mt-4 space-y-2">
                <div className="h-10 w-full animate-pulse bg-white/10" />
                <div className="h-10 w-full animate-pulse bg-white/10" />
                <div className="h-10 w-full animate-pulse bg-white/10" />
              </div>
              <div className="mt-4 h-10 w-full animate-pulse bg-accent/35" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (reservationResult) {
    const r = reservationResult;
    const dateStr = r.reservation_date || r.date;
    const timeStr = (r.reservation_time || r.time || "").toString().replace(/\.\d+Z?$/i, "").slice(0, 5);
    return (
      <div className="relative min-h-screen bg-[#0a0908] text-white">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[min(40vh,420px)] bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,rgba(197,157,95,0.09),transparent_55%)]"
          aria-hidden
        />
        <Header variant="marketing" />
        <main className="relative z-10 w-full px-4 py-6 pb-12 sm:px-6 md:py-8 lg:px-8 xl:px-12">
          <div className="mx-auto grid max-w-[1280px] content-start items-start gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8 xl:gap-10">
            <BookPageImageColumn
              alt={restaurant?.name ? `Book a table · ${restaurant.name}` : "Restaurant"}
              src={bookingParallaxImage}
            />
            <div className="w-full border border-white/10 bg-white/[0.03] p-5 text-center shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-accent">Confirmed</p>
            <h1 className="font-display mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Booking request received
            </h1>
            <p className="mt-2 text-xs text-white/75 sm:text-sm">
              {restaurant?.name} — {dateStr} at {timeStr || "—"}, party of {r.party_size ?? party_size}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-[11px] leading-relaxed text-white/55 sm:text-xs">
              {isAuthenticated
                ? "You can view and manage your reservations in your account."
                : "If you provided an email, you will receive a confirmation once the restaurant confirms your table. To track your booking in your account, log in with the same email."}
            </p>
            {!isAuthenticated && (
              <p className="mt-2 text-[11px] text-white/55 sm:text-xs">
                <Link href="/login" className="font-medium text-accent underline-offset-2 hover:underline">
                  Log in
                </Link>{" "}
                to see and manage your reservations.
              </p>
            )}
            <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
              {isAuthenticated ? (
                <Link
                  href="/reservations"
                  className="touch-manipulation inline-flex h-10 w-full items-center justify-center rounded-sm bg-accent text-[10px] font-semibold uppercase tracking-[0.18em] text-wood-950 shadow-md transition-colors hover:bg-accent-hover sm:h-11 sm:w-auto sm:min-w-[200px] sm:text-[11px]"
                >
                  View my reservations
                </Link>
              ) : null}
              <Link
                href="/"
                className="touch-manipulation inline-flex h-10 w-full items-center justify-center border border-white/20 bg-white/[0.06] text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 transition-colors hover:border-accent/40 hover:bg-white/[0.1] sm:h-11 sm:w-auto sm:min-w-[160px] sm:text-[11px]"
              >
                Back to home
              </Link>
            </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#0a0908] text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[min(40vh,420px)] bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,rgba(197,157,95,0.09),transparent_55%)]"
        aria-hidden
      />
      <Header variant="marketing" />
      <main className="relative z-10 w-full px-4 py-6 pb-12 sm:px-6 md:py-8 lg:px-8 xl:px-12">
        <div className="mx-auto grid max-w-[1280px] content-start items-start gap-6 lg:grid-cols-2 lg:items-stretch lg:gap-8 xl:gap-10">
          <BookPageImageColumn
            alt={restaurant?.name ? `Book a table · ${restaurant.name}` : "Restaurant dining"}
            src={bookingParallaxImage}
          />
          <div className="min-w-0">
        <Link
          href="/"
          className="touch-manipulation mb-4 inline-flex min-h-9 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-accent"
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to home
        </Link>

        <div className="mb-4 text-left md:mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Reservations</p>
          <h1 className="font-display mt-1.5 text-2xl font-semibold tracking-tight text-white md:text-3xl">Book a table</h1>
          <p className="mt-1 text-sm text-white/60">{restaurant.name}</p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
            Step {bookStep} of 2 — {bookStep === 1 ? "When" : "Your details"}
          </p>
        </div>

        {!isAuthenticated && bookStep === 2 && (
          <div className="mb-4 w-full border border-amber-500/35 bg-amber-500/[0.08] px-3 py-2 text-left text-xs leading-snug text-amber-100/95 ring-1 ring-amber-500/20">
            Booking as guest: enter your name and at least one of phone or email.{" "}
            <Link href="/login" className="font-medium text-accent underline-offset-2 hover:underline">
              Log in
            </Link>{" "}
            to track your booking.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-none flex-col gap-4 border border-white/10 bg-white/[0.03] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-5"
        >
          {bookStep === 1 && reservationConfigMissing && (
            <div className="border border-amber-500/40 bg-amber-500/[0.08] px-3 py-2.5 text-[11px] leading-relaxed text-amber-100 ring-1 ring-amber-500/25 sm:text-xs">
              <p className="font-medium text-amber-50">Reservations not available yet</p>
              <p className="mt-1 text-amber-100/90">
                This restaurant has not set up reservation settings. The owner needs to add reservation configuration and opening hours in the dashboard. Please contact the restaurant or try again later.
              </p>
            </div>
          )}
          {error && (
            <p className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 ring-1 ring-red-500/20">
              {error}
            </p>
          )}

          {bookStep === 1 && (
          <>
          {/* When — step 1 */}
          <div className="w-full">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">When</p>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  Date
                </label>
                <input
                  type="date"
                  value={reservation_date}
                  onChange={(e) => setReservation_date(e.target.value)}
                  min={(() => {
                    const t = new Date();
                    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
                  })()}
                  className="book-form-input touch-manipulation h-11 w-full rounded-sm text-sm outline-none"
                />
                {dateOptions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-1 gap-y-0.5 text-[11px] leading-snug text-white/50">
                    <span className="mr-1 shrink-0 text-white/35">Quick:</span>
                    {dateOptions.map((opt, i) => {
                      const selected = reservation_date === opt.value;
                      return (
                        <span key={opt.value} className="inline-flex items-center">
                          {i > 0 ? <span className="mx-0.5 text-white/25" aria-hidden>·</span> : null}
                          <button
                            type="button"
                            onClick={() => setReservation_date(opt.value)}
                            className={`touch-manipulation underline-offset-2 transition-colors ${
                              selected
                                ? "font-medium text-accent"
                                : "text-white/55 hover:text-accent hover:underline"
                            }`}
                          >
                            {opt.label}
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-white/8 pt-3">
                <label htmlFor="book-time" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  Time
                </label>
                {availabilityLoading ? (
                  <p className="py-2 text-xs text-white/45">Loading availability…</p>
                ) : timeSlotsToShow.length === 0 ? (
                  <p className="py-2 text-xs text-white/45">No times for this day.</p>
                ) : (
                  <select
                    id="book-time"
                    value={reservation_time}
                    onChange={(e) => setReservation_time(e.target.value)}
                    className="book-form-select touch-manipulation h-11 w-full rounded-sm text-sm outline-none"
                  >
                    {timeSlotsToShow.map((slot) => {
                      const disabled = isTimeSlotPast(slot) || isSlotUnavailable(slot);
                      let suffix = "";
                      if (isTimeSlotPast(slot)) suffix = " — past";
                      else if (isSlotUnavailable(slot)) suffix = " — unavailable";
                      return (
                        <option key={slot} value={slot} disabled={disabled}>
                          {slot}
                          {suffix}
                        </option>
                      );
                    })}
                  </select>
                )}
              </div>

              <div className="border-t border-white/8 pt-3">
                <label htmlFor="book-guests" className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                  Guests
                </label>
                <select
                  id="book-guests"
                  value={party_size}
                  onChange={(e) => setParty_size(Number(e.target.value))}
                  className="book-form-select touch-manipulation h-11 w-full rounded-sm text-sm outline-none"
                >
                  {PARTY_SIZES.map((n) => (
                    <option key={n} value={n}>
                      {n} {n === 1 ? "guest" : "guests"}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={goToStep2}
            disabled={availabilityLoading || reservationConfigMissing}
            className="touch-manipulation h-10 w-full rounded-sm bg-accent text-[11px] font-semibold uppercase tracking-[0.14em] text-wood-950 shadow-md transition-colors hover:bg-accent-hover disabled:opacity-50 active:scale-[0.99] sm:text-xs"
          >
            Continue
          </button>
          </>
          )}

          {bookStep === 2 && (
          <>
          <div className="px-0 py-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">Your selection</p>
            <p className="mt-1 text-sm leading-snug text-white/90">{whenSummaryLine}</p>
            <button
              type="button"
              onClick={() => {
                setError("");
                setBookStep(1);
              }}
              className="mt-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-accent transition-colors hover:text-accent/90 hover:underline"
            >
              Edit date & time
            </button>
          </div>

          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Contact</p>

          <div className="grid w-full grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Your name</span>
              <input
                type="text"
                value={customer_name}
                onChange={(e) => setCustomer_name(e.target.value)}
                required
                autoComplete="name"
                className="book-form-input touch-manipulation h-10 w-full rounded-sm px-3 text-sm outline-none"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
                Phone {!isAuthenticated ? "(if no email)" : ""}
              </span>
              <input
                type="tel"
                value={confirmation_phone}
                onChange={(e) => setConfirmation_phone(e.target.value)}
                autoComplete="tel"
                className="book-form-input touch-manipulation h-10 w-full rounded-sm px-3 text-sm outline-none"
              />
            </label>
          </div>

          <label className="flex w-full flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">
              Email {!isAuthenticated ? "(if no phone)" : "(optional)"}
            </span>
            <input
              type="email"
              value={customer_email}
              onChange={(e) => setCustomer_email(e.target.value)}
              autoComplete="email"
              className="book-form-input touch-manipulation h-10 w-full rounded-sm px-3 text-sm outline-none"
            />
          </label>

          <label className="flex w-full flex-col gap-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Notes (optional)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Allergies, special requests..."
              className="book-form-input touch-manipulation min-h-[72px] w-full resize-y rounded-sm px-3 py-2 text-sm outline-none"
            />
          </label>

          <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setError("");
                setBookStep(1);
              }}
              className="touch-manipulation h-11 w-full rounded-sm border border-white/20 bg-white/[0.06] text-[11px] font-semibold uppercase tracking-[0.12em] text-white/90 transition-colors hover:border-accent/35 hover:bg-white/[0.1] sm:h-12 sm:min-w-[140px] sm:flex-1"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting || reservationConfigMissing}
              className="touch-manipulation h-11 w-full flex-[2] rounded-sm bg-accent text-[11px] font-semibold uppercase tracking-[0.14em] text-wood-950 shadow-md transition-colors hover:bg-accent-hover disabled:opacity-50 active:scale-[0.99] sm:h-12 sm:text-xs"
            >
              {submitting ? "Confirming…" : reservationConfigMissing ? "Booking unavailable" : "Confirm booking"}
            </button>
          </div>
          </>
          )}
        </form>
          </div>
        </div>
      </main>
    </div>
  );
}
