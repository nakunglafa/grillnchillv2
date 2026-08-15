"use client";

import { useLocalizedPath } from "@/lib/use-locale";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { getRestaurant, createReservation, getAvailability, submitGdprConsent } from "@/lib/api";
import { GdprConsent, buildGdprConsentPayload } from "@/components/GdprConsent";
import { useRestaurant } from "@/context/RestaurantContext";
import { cakeOrderPath, getSlugForId, isBakeryRestaurant } from "@/lib/restaurants";
import {
  extractWebsiteContentFromPayload,
  getBookPageImage,
  mergeWebsiteContent,
  resolveMediaUrl,
} from "@/lib/website-content";

/** Left column visual — match homepage hero; override with NEXT_PUBLIC_BOOK_PAGE_IMAGE */
const BOOK_PAGE_IMAGE =
  process.env.NEXT_PUBLIC_BOOK_PAGE_IMAGE ||
  process.env.NEXT_PUBLIC_PARALLAX_RESERVE_BG ||
  process.env.NEXT_PUBLIC_HERO_COLLAGE_MAIN ||
  "";

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

/** Human-friendly label for a HH:mm slot (e.g. 20:00 → 8 PM). */
function formatBookTimeLabel(slot) {
  const m = String(slot || "").match(/^(\d{1,2}):(\d{2})/);
  if (!m) return slot;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10) || 0;
  if (h === 0 && min === 0) return "12 AM (midnight)";
  if (h === 12 && min === 0) return "12 PM (noon)";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return min === 0 ? `${h12} ${ampm}` : `${h12}:${String(min).padStart(2, "0")} ${ampm}`;
}
/** Parse time string "HH:mm" or "HH:mm:ss" to minutes */
function parseTimeToMinutes(str) {
  if (!str || typeof str !== "string") return 0;
  const parts = str.trim().split(":");
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10) || 0;
  return Number.isNaN(h) ? 0 : h * 60 + m;
}

/** Slot granularity in minutes. Backend availability returns 15-min slots, so
 * we match here to avoid hiding e.g. 12:45 / 13:15 from the picker. */
const SLOT_INTERVAL_MIN = 15;

/** Get all open-close ranges (in minutes) for the given date, derived from
 * the restaurant's opening hours. Supports multiple rows per day (lunch +
 * dinner) and alternate field names. */
function getOpeningRangesForDay(openingSlots, dateStr) {
  if (!openingSlots || openingSlots.length === 0) return null;
  const day = getDayOfWeekForDate(dateStr);
  const daySlots = openingSlots.filter(
    (s) => (s.day_of_week || s.day || "").toString().toLowerCase() === day
  );
  if (daySlots.length === 0) return [];
  const ranges = [];
  const pushRange = (openStr, closeStr) => {
    if (!openStr || !closeStr) return;
    const o = parseTimeToMinutes(openStr);
    const c = parseTimeToMinutes(closeStr);
    // Allow overnight ranges (e.g. 12:00 → 01:00) where close < open
    if (o === c) return;
    ranges.push([o, c]);
  };
  daySlots.forEach((s) => {
    pushRange(s.open_time || s.open || s.from, s.close_time || s.close || s.to);
    pushRange(s.open_time_2 || s.open_2 || s.second_open, s.close_time_2 || s.close_2 || s.second_close);
    if (Array.isArray(s.shifts)) {
      s.shifts.forEach((sh) => pushRange(sh.open_time || sh.open || sh.from, sh.close_time || sh.close || sh.to));
    }
    if (Array.isArray(s.slots)) {
      s.slots.forEach((sh) => pushRange(sh.open_time || sh.open || sh.from, sh.close_time || sh.close || sh.to));
    }
  });
  return ranges;
}

/** Get time slots for the day from opening hours — supports overnight (e.g. noon–1am). */
function getTimeSlotsForDay(openingSlots, dateStr) {
  if (!openingSlots || openingSlots.length === 0) return FULL_DAY_TIME_SLOTS;
  const ranges = getOpeningRangesForDay(openingSlots, dateStr);
  if (ranges === null) return FULL_DAY_TIME_SLOTS;
  if (ranges.length === 0) return [];
  const minuteSet = new Set();
  const addMinutes = (from, to) => {
    const startMinutes = Math.ceil(from / SLOT_INTERVAL_MIN) * SLOT_INTERVAL_MIN;
    for (let m = startMinutes; m < to; m += SLOT_INTERVAL_MIN) {
      if (m >= 0 && m < 24 * 60) minuteSet.add(m);
    }
  };
  ranges.forEach(([openMinutes, closeMinutes]) => {
    if (closeMinutes > openMinutes) {
      addMinutes(openMinutes, closeMinutes);
    } else {
      // Overnight: open → midnight on this calendar day
      addMinutes(openMinutes, 24 * 60);
    }
  });
  // Morning after midnight still belongs to prior day's overnight session
  if (dateStr) {
    const [y, mo, d] = dateStr.split("-").map(Number);
    const prior = new Date(y, mo - 1, d);
    prior.setDate(prior.getDate() - 1);
    const py = prior.getFullYear();
    const pm = String(prior.getMonth() + 1).padStart(2, "0");
    const pd = String(prior.getDate()).padStart(2, "0");
    const priorRanges = getOpeningRangesForDay(openingSlots, `${py}-${pm}-${pd}`);
    if (Array.isArray(priorRanges)) {
      priorRanges.forEach(([openMinutes, closeMinutes]) => {
        if (closeMinutes < openMinutes) addMinutes(0, closeMinutes);
      });
    }
  }
  return Array.from(minuteSet)
    .sort((a, b) => a - b)
    .map((m) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
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

function getBookingParallaxImageFromRestaurant(restaurant, restaurantId) {
  const raw = extractWebsiteContentFromPayload({
    restaurant,
    website_content: restaurant?.website_content,
    content_json: restaurant?.content_json,
  });
  const content = mergeWebsiteContent(restaurantId, raw);
  const logo = resolveMediaUrl(restaurant?.logo_url || restaurant?.logoUrl || "");
  return (
    getBookPageImage(content, logo) ||
    resolveMediaUrl(BOOK_PAGE_IMAGE) ||
    logo ||
    ""
  );
}

function BookPageImageColumn({ alt = "Restaurant", src = BOOK_PAGE_IMAGE }) {
  const normalizedSrc = typeof src === "string" ? src.trim() : "";
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [resolvedSrc, setResolvedSrc] = useState(normalizedSrc || BOOK_PAGE_IMAGE || "");
  const hasImageSrc = typeof resolvedSrc === "string" && resolvedSrc.trim().length > 0;

  useEffect(() => {
    setResolvedSrc(normalizedSrc || BOOK_PAGE_IMAGE || "");
    setImageLoaded(false);
    setImageFailed(false);
  }, [normalizedSrc]);

  return (
    <div className="relative aspect-5/3 max-h-[240px] w-full shrink-0 overflow-hidden rounded-sm border border-white/10 sm:aspect-2/1 sm:max-h-[280px] lg:aspect-auto lg:h-full lg:min-h-0 lg:max-h-none lg:w-full lg:self-stretch">
      {!hasImageSrc || imageFailed ? (
        <div
          className="absolute inset-0 bg-[radial-gradient(ellipse_70%_60%_at_40%_30%,rgba(197,157,95,0.2),transparent_55%),linear-gradient(160deg,#1a1510_0%,#0a0908_100%)]"
          aria-hidden
        />
      ) : !imageLoaded ? (
        <div className="absolute inset-0 animate-pulse bg-white/10" aria-hidden />
      ) : null}
      {hasImageSrc ? (
        <img
          key={resolvedSrc}
          src={resolvedSrc}
          alt={alt}
          loading="eager"
          decoding="async"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            const fallback = (BOOK_PAGE_IMAGE || "").trim();
            if (resolvedSrc !== fallback && fallback) {
              // Retry with a stable fallback when remote image intermittently fails.
              setResolvedSrc(fallback);
              setImageLoaded(false);
              setImageFailed(false);
              return;
            }
            setImageFailed(true);
            setImageLoaded(false);
          }}
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            imageLoaded && !imageFailed ? "opacity-100" : "opacity-0"
          }`}
          sizes="(max-width: 1024px) 100vw, 50vw"
        />
      ) : null}
      <div
        className="pointer-events-none absolute inset-0 bg-linear-to-t from-[#0a0908]/90 via-[#0a0908]/15 to-transparent lg:bg-linear-to-r lg:from-transparent lg:via-transparent lg:to-[#0a0908]/65"
        aria-hidden
      />
    </div>
  );
}

export default function BookPage() {
  const lp = useLocalizedPath();
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuth();
  const { activeRestaurantId } = useRestaurant();
  const RESTAURANT_ID = activeRestaurantId;

  useEffect(() => {
    if (!RESTAURANT_ID || !isBakeryRestaurant(RESTAURANT_ID)) return;
    const slug = getSlugForId(RESTAURANT_ID) || "bakery";
    router.replace(lp(cakeOrderPath(slug)));
  }, [RESTAURANT_ID, router, lp]);

  const [restaurant, setRestaurant] = useState(null);
  const [openingSlots, setOpeningSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
  const [gdprConsent, setGdprConsent] = useState(false);
  const [reservationResult, setReservationResult] = useState(null);
  /** 1 = date/time/guests, 2 = contact & confirm */
  const [bookStep, setBookStep] = useState(1);
  const bookingParallaxImage = useMemo(
    () => getBookingParallaxImageFromRestaurant(restaurant, RESTAURANT_ID),
    [restaurant, RESTAURANT_ID]
  );

  function handleReservationDateChange(nextDate) {
    setReservation_date(nextDate);
    if (!nextDate) {
      setError("");
      return;
    }
    if (!isDayOpen(openingSlots, nextDate)) {
      setError("Restaurant is closed on the selected date. Please choose another date.");
      return;
    }
    setError("");
  }

  useEffect(() => {
    if (!RESTAURANT_ID) return undefined;
    setLoading(true);
    setLoadError(false);
    getRestaurant(RESTAURANT_ID)
      .then((data) => {
        const restaurantData = data?.restaurant
          ? {
              ...data.restaurant,
              website_content:
                data?.restaurant?.website_content ??
                data?.website_content ??
                data?.content_json ??
                null,
              content_json:
                data?.restaurant?.content_json ??
                data?.content_json ??
                data?.website_content ??
                null,
            }
          : null;
        setRestaurant(restaurantData);
        setOpeningSlots(data?.opening_hours?.opening_slots ?? []);
      })
      .catch(() => {
        setRestaurant(null);
        setOpeningSlots([]);
        setLoadError(true);
      })
      .finally(() => setLoading(false));
  }, [RESTAURANT_ID]);

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

  // Keep the currently chosen date; do not auto-overwrite user selection.
  // We only auto-pick a date once if nothing has been selected yet.
  useEffect(() => {
    if (!reservation_date && dateOptions.length > 0) {
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
  }, [reservation_date, party_size, RESTAURANT_ID]);

  useEffect(() => {
    if (user) {
      setCustomer_name(user.name ?? "");
      setCustomer_email(user.email ?? "");
    }
  }, [user]);

  // Guests can book; they must provide name and at least one of phone or email.

  function validateGuestContact() {
    const nameOk = (customer_name || "").trim().length > 0;
    const phoneVal = (confirmation_phone || "").trim();
    const emailVal = (customer_email || "").trim();
    const hasPhone = phoneVal.length > 0;
    const hasEmail = emailVal.length > 0;
    if (!nameOk) {
      setError("Please enter your name.");
      return false;
    }
    if (!isAuthenticated && !hasPhone && !hasEmail) {
      setError("As a guest, please provide at least your phone number or email.");
      return false;
    }
    if (hasEmail) {
      // Simple but effective email shape check; server still does the real validation.
      const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRe.test(emailVal)) {
        setError("Please enter a valid email address.");
        return false;
      }
    }
    if (hasPhone) {
      // Allow +, digits, spaces, dashes, parentheses; require at least 7 digits.
      const digitCount = phoneVal.replace(/\D/g, "").length;
      if (digitCount < 7 || !/^[+\d][\d\s().-]*$/.test(phoneVal)) {
        setError("Please enter a valid phone number.");
        return false;
      }
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (bookStep !== 2) return;
    setError("");
    if (!validateGuestContact()) return;
    if (!gdprConsent) {
      setError("Please accept the privacy notice to continue.");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Record the GDPR consent first so we always have an audit row,
      //    even if the reservation step then fails for some other reason.
      const consentPayload = await buildGdprConsentPayload();
      try {
        await submitGdprConsent(RESTAURANT_ID, consentPayload, token || undefined);
      } catch (consentErr) {
        const msg =
          consentErr?.data?.message ||
          (consentErr?.data?.errors
            ? Object.values(consentErr.data.errors).flat().join(" ")
            : null) ||
          "Could not record your consent. Please try again.";
        setError(msg);
        setSubmitting(false);
        return;
      }
      // 2. Create the reservation with personal data only.
      // Normalize to HH:mm so backend parsers accept the value reliably.
      const timeNorm = String(reservation_time || "")
        .replace(/\.\d+Z?$/i, "")
        .trim()
        .slice(0, 5);
      const body = {
        restaurant_id: Number(RESTAURANT_ID),
        reservation_date,
        reservation_time: timeNorm,
        time: timeNorm,
        party_size: Number(party_size),
        customer_name: (customer_name || "").trim(),
        confirmation_phone: (confirmation_phone || "").trim() || undefined,
        customer_email: (customer_email || "").trim() || undefined,
        notes: (notes || "").trim() || undefined,
      };
      const data = await createReservation(token || undefined, body);
      const reservation = data?.data ?? data;
      // Prefer API fields; fall back to what the guest just selected.
      setReservationResult({
        ...reservation,
        reservation_date: reservation?.reservation_date || reservation?.date || reservation_date,
        reservation_time:
          reservation?.reservation_time ||
          reservation?.time ||
          reservation?.reservationTime ||
          timeNorm,
        party_size: reservation?.party_size ?? party_size,
      });
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
  const isSelectedDateClosed = useMemo(() => {
    if (!reservation_date) return false;
    return !isDayOpen(openingSlots, reservation_date);
  }, [openingSlots, reservation_date]);

  // Always show all time slots for the day (both lunch and dinner etc.); use API to mark which are bookable
  const timeSlotsToShow = timeSlotsForDay;
  // null  -> API hasn't returned yet (don't mark anything unavailable)
  // Set() -> API returned no slots (mark everything unavailable)
  // Set(x)-> API returned specific bookable slots
  const availableSlotsSet = useMemo(() => {
    if (availabilitySlots === null) return null;
    return new Set(
      availabilitySlots.map((t) => {
        const s = typeof t === "string" ? t.replace(/\.\d+Z?$/i, "").trim() : "";
        const match = s.match(/^(\d{1,2}):(\d{2})/);
        return match ? `${String(parseInt(match[1], 10)).padStart(2, "0")}:${match[2]}` : s.slice(0, 5);
      })
    );
  }, [availabilitySlots]);

  const isToday = useMemo(() => {
    if (!reservation_date) return false;
    const t = new Date();
    const y = t.getFullYear();
    const m = String(t.getMonth() + 1).padStart(2, "0");
    const d = String(t.getDate()).padStart(2, "0");
    return reservation_date === `${y}-${m}-${d}`;
  }, [reservation_date]);
  const currentMinutes = useMemo(() => {
    if (!isToday) return 0;
    const n = new Date();
    return n.getHours() * 60 + n.getMinutes();
  }, [isToday]);
  const isTimeSlotPast = (slot) => {
    if (!isToday) return false;
    const [h, m] = slot.split(":").map(Number);
    return h * 60 + m <= currentMinutes;
  };

  // Opening-hour shifts for the selected date, expressed as [openMin, closeMin]
  // pairs. Used below to detect which shifts the availability API actually
  // evaluated, so that a backend bug skipping later shifts (e.g. dinner) does
  // not turn every evening slot into "unavailable".
  const todayShifts = useMemo(() => {
    if (!reservation_date) return [];
    const ranges = getOpeningRangesForDay(openingSlots, reservation_date);
    return ranges ?? [];
  }, [openingSlots, reservation_date]);

  // A shift is "covered" if availableSlotsSet has at least one slot inside it.
  // We only enforce the availability filter inside covered shifts; outside of
  // them we trust opening hours and let the user pick a time (the backend
  // still validates on submit).
  const coveredShifts = useMemo(() => {
    if (!availableSlotsSet || todayShifts.length === 0) return [];
    const inShift = (m, open, close) =>
      close > open ? m >= open && m < close : m >= open || m < close;
    return todayShifts.filter(([open, close]) => {
      for (const slot of availableSlotsSet) {
        const m = parseTimeToMinutes(slot);
        if (inShift(m, open, close)) return true;
      }
      return false;
    });
  }, [availableSlotsSet, todayShifts]);

  const isSlotUnavailable = (slot) => {
    if (availableSlotsSet === null) return false; // availability not loaded yet
    if (availableSlotsSet.has(slot)) return false;
    // Outside of any shift the API actually evaluated → trust opening hours.
    const m = parseTimeToMinutes(slot);
    const inCoveredShift = coveredShifts.some(([open, close]) =>
      close > open ? m >= open && m < close : m >= open || m < close
    );
    return inCoveredShift;
  };

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
    const timePart = reservation_time ? formatBookTimeLabel(reservation_time) : "—";
    return `${datePart} · ${timePart} · ${party_size} ${party_size === 1 ? "guest" : "guests"}`;
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
    if (isSelectedDateClosed) {
      setError("Restaurant is closed on the selected date. Please choose another date.");
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

  if (RESTAURANT_ID && isBakeryRestaurant(RESTAURANT_ID)) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <p className="text-center text-zinc-600 dark:text-zinc-300">Redirecting to cake orders…</p>
        </main>
      </div>
    );
  }

  if (loadError && !restaurant) {
    return (
      <div className="relative min-h-screen bg-[#0a0908] text-white">
        <Header variant="marketing" />
        <main className="relative z-10 w-full px-4 py-6 pb-12 sm:px-6 md:py-8 lg:px-8 xl:px-12">
          <div className="mx-auto flex max-w-[640px] flex-col items-start gap-3 border border-red-500/30 bg-red-500/5 p-5 ring-1 ring-red-500/15">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-red-300">Error</p>
            <h1 className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              We couldn&apos;t load the restaurant
            </h1>
            <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
              The booking service is temporarily unreachable. Please check your connection and try again.
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:gap-3">
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.location.reload();
                }}
                className="touch-manipulation inline-flex h-10 items-center justify-center rounded-sm bg-accent px-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-wood-950 shadow-md transition-colors hover:bg-accent-hover sm:text-[11px]"
              >
                Retry
              </button>
              <Link
                href={lp("/")}
                className="touch-manipulation inline-flex h-10 items-center justify-center border border-white/20 bg-white/6 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 transition-colors hover:border-accent/40 hover:bg-white/10 sm:text-[11px]"
              >
                Back to home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
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
            <div className="w-full border border-white/10 bg-white/3 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm sm:p-5">
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
    const timeLabel = timeStr ? formatBookTimeLabel(timeStr) : "—";
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
            <div className="w-full border border-white/10 bg-white/3 p-5 text-center shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm sm:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.26em] text-accent">Confirmed</p>
            <h1 className="font-display mt-3 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Reservation request received
            </h1>
            <p className="mt-2 text-xs text-white/75 sm:text-sm">
              {restaurant?.name} — {dateStr} at {timeLabel}, party of {r.party_size ?? party_size}
            </p>
            <p className="mx-auto mt-3 max-w-xl text-[11px] leading-relaxed text-white/55 sm:text-xs">
              {isAuthenticated
                ? "You can view and manage your reservations in your account. Free online cancellation is available up to 24 hours before your reservation; within 24 hours, please contact the restaurant."
                : "If you provided an email, you will receive a confirmation once the restaurant confirms your table. To track your reservation in your account, log in with the same email. Free online cancellation (when logged in) is available up to 24 hours before your reservation."}
            </p>
            {!isAuthenticated && (
              <p className="mt-2 text-[11px] text-white/55 sm:text-xs">
                <Link href={lp("/login")} className="font-medium text-accent underline-offset-2 hover:underline">
                  Log in
                </Link>{" "}
                to see and manage your reservations.
              </p>
            )}
            <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
              {isAuthenticated ? (
                <Link
                  href={lp("/reservations")}
                  className="touch-manipulation inline-flex h-10 w-full items-center justify-center rounded-sm bg-accent text-[10px] font-semibold uppercase tracking-[0.18em] text-wood-950 shadow-md transition-colors hover:bg-accent-hover sm:h-11 sm:w-auto sm:min-w-[200px] sm:text-[11px]"
                >
                  View my reservations
                </Link>
              ) : null}
              <Link
                href={lp("/")}
                className="touch-manipulation inline-flex h-10 w-full items-center justify-center border border-white/20 bg-white/6 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/90 transition-colors hover:border-accent/40 hover:bg-white/10 sm:h-11 sm:w-auto sm:min-w-[160px] sm:text-[11px]"
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
          href={lp("/")}
          className="touch-manipulation mb-4 inline-flex min-h-9 items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/50 transition-colors hover:text-accent"
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to home
        </Link>

        <div className="mb-4 text-left md:mb-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-accent">Reservations</p>
          <h1 className="font-display mt-1.5 text-2xl font-semibold tracking-tight text-white md:text-3xl">Reserve a table</h1>
          <p className="mt-1 text-sm text-white/60">{restaurant.name}</p>
          <p className="mt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-white/45">
            Step {bookStep} of 2 — {bookStep === 1 ? "When" : "Your details"}
          </p>
        </div>

        {!isAuthenticated && bookStep === 2 && (
          <div className="mb-4 w-full border border-amber-500/35 bg-amber-500/8 px-3 py-2 text-left text-xs leading-snug text-amber-100/95 ring-1 ring-amber-500/20">
            Reserving as guest: enter your name and at least one of phone or email.{" "}
            <Link href={lp("/login")} className="font-medium text-accent underline-offset-2 hover:underline">
              Log in
            </Link>{" "}
            to track your reservation.
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="flex w-full max-w-none flex-col gap-4 border border-white/10 bg-white/3 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm sm:p-5"
        >
          {bookStep === 1 && reservationConfigMissing && (
            <div className="border border-amber-500/40 bg-amber-500/8 px-3 py-2.5 text-[11px] leading-relaxed text-amber-100 ring-1 ring-amber-500/25 sm:text-xs">
              <p className="font-medium text-amber-50">Reservations not available yet</p>
              <p className="mt-1 text-amber-100/90">
                This restaurant has not set up reservation settings. The owner needs to add reservation configuration and opening hours in the dashboard. Please contact the restaurant or try again later.
              </p>
            </div>
          )}
          {error && (
            <p
              role="alert"
              aria-live="polite"
              className="border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200 ring-1 ring-red-500/20"
            >
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
                  onChange={(e) => handleReservationDateChange(e.target.value)}
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
                            onClick={() => handleReservationDateChange(opt.value)}
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
                {(() => {
                  // Only show slots the user can actually book: drop both
                  // past-of-day slots and anything the backend flagged as
                  // unavailable. Showing them disabled was just clutter.
                  const selectableSlots = timeSlotsToShow.filter(
                    (slot) => !isTimeSlotPast(slot) && !isSlotUnavailable(slot)
                  );
                  if (availabilityLoading) {
                    return (
                      <p className="py-2 text-xs text-white/45">Loading availability…</p>
                    );
                  }
                  if (isSelectedDateClosed) {
                    return (
                      <p className="py-2 text-xs text-amber-300">Restaurant is closed on this date.</p>
                    );
                  }
                  if (selectableSlots.length === 0) {
                    return (
                      <p className="py-2 text-xs text-white/45">No times available for this day.</p>
                    );
                  }
                  return (
                    <select
                      id="book-time"
                      value={reservation_time}
                      onChange={(e) => setReservation_time(e.target.value)}
                      className="book-form-select touch-manipulation h-11 w-full rounded-sm text-sm outline-none"
                    >
                      {selectableSlots.map((slot) => (
                        <option key={slot} value={slot}>
                          {formatBookTimeLabel(slot)}
                        </option>
                      ))}
                    </select>
                  );
                })()}
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
              className="mt-2 text-[11px] font-semibold uppercase tracking-widest text-accent transition-colors hover:text-accent/90 hover:underline"
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

          <GdprConsent
            id="book-gdpr-consent"
            variant="dark"
            checked={gdprConsent}
            onChange={setGdprConsent}
          />

          <div className="mt-2 flex w-full flex-col gap-3 sm:mt-3 sm:flex-row sm:items-stretch sm:gap-3">
            <button
              type="button"
              onClick={() => {
                setError("");
                setBookStep(1);
              }}
              className="touch-manipulation inline-flex min-h-[48px] w-full items-center justify-center rounded-sm border border-white/20 bg-white/6 px-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/90 transition-colors hover:border-accent/35 hover:bg-white/10 sm:min-h-12 sm:flex-1 sm:min-w-0 sm:text-xs"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={submitting || reservationConfigMissing || !gdprConsent}
              className="touch-manipulation inline-flex min-h-[48px] w-full items-center justify-center rounded-sm bg-accent px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-wood-950 shadow-md transition-colors hover:bg-accent-hover disabled:opacity-50 active:scale-[0.99] sm:min-h-12 sm:flex-1 sm:min-w-0 sm:text-xs"
            >
              {submitting ? "Confirming…" : reservationConfigMissing ? "Reservation unavailable" : "Confirm reservation"}
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
