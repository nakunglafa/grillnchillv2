"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  getOwnerRestaurantReservations,
  updateReservationStatus,
} from "@/lib/api";
import { toArray } from "@/lib/owner-utils";

function getReservationDate(r) {
  const res = r?.reservation ?? r;
  const dateStr = (res.reservation_date ?? res.reservationDate ?? res.date ?? res.booking_date ?? res.booking?.date ?? "").toString().trim();
  const timeStr = (res.reservation_time ?? res.reservationTime ?? res.time ?? res.booking_time ?? res.booking?.time ?? "").toString().trim();
  // Prefer explicit date+time fields so wall-clock times are not shifted by timezone conversions.
  if (dateStr) {
    const normalized = dateStr.replace(/^(\d{4})-(\d{2})-(\d{2}).*/, "$1-$2-$3");
    if (normalized && normalized.length >= 10) {
      const [y, m, day] = normalized.split("-").map(Number);
      let timePart = timeStr ? timeStr.replace(/\.\d+Z?$/i, "").replace(/:$/, "").slice(0, 8) : "00:00:00";
      if (timePart && timePart.length === 5) timePart += ":00";
      const [h = 0, min = 0, sec = 0] = (timePart || "00:00:00").split(":").map(Number);
      const d = new Date(y, m - 1, day, h, min, sec);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  const possibleIso =
    res.reservation_datetime ??
    res.datetime ??
    res.date_time ??
    res.scheduled_at ??
    res.booking_datetime ??
    res.reservation_time ??
    res.reservationTime ??
    res.reservation_date ??
    res.date;
  if (possibleIso && typeof possibleIso === "string" && possibleIso.includes("T")) {
    const normalized = possibleIso.replace(/\.(\d{4,})Z?$/i, (_, frac) => `.${frac.slice(0, 3)}Z`);
    const d = new Date(normalized);
    if (!Number.isNaN(d.getTime())) return d;
  }

  if (!dateStr) {
    if (timeStr && timeStr.includes("T")) {
      const d = new Date(timeStr);
      if (!Number.isNaN(d.getTime())) return d;
    }
    return null;
  }
  if (dateStr.includes("T")) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

function formatDateTime(r) {
  const d = getReservationDate(r);
  if (!d || Number.isNaN(d.getTime())) {
    return formatDateTimeFallback(r);
  }
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** Fallback when getReservationDate fails - try to show date/time from any common field */
function formatDateTimeFallback(r) {
  const rawDate = (r.reservation_date ?? r.reservationDate ?? r.date ?? r.booking_date ?? r.booking?.date ?? r.scheduled_date ?? "").toString().trim();
  const rawTime = (r.reservation_time ?? r.reservationTime ?? r.time ?? r.booking_time ?? r.booking?.time ?? r.scheduled_time ?? "").toString().trim();
  const rawIso = (r.reservation_datetime ?? r.datetime ?? r.reservation_time ?? r.reservationTime ?? r.scheduled_at ?? r.booking_datetime ?? "").toString().trim();
  if (rawIso) {
    const d = new Date(rawIso);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(undefined, {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    }
  }
  if (rawDate) {
    const d = new Date(rawDate + (rawTime ? `T${rawTime}` : ""));
    if (!Number.isNaN(d.getTime())) {
      const dateStr = d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
      const timeStr = rawTime ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: true }) : "";
      return timeStr ? `${dateStr} at ${timeStr}` : dateStr;
    }
    return [rawDate, rawTime].filter(Boolean).join(" ");
  }
  return "";
}

/** Get human-readable date/time - tries formatDateTime, then getRawDateTime, then raw values */
function getDisplayDateTime(r) {
  const formatted = formatDateTime(r);
  if (formatted) return formatted;
  const raw = getRawDateTime(r);
  if (raw) return raw;
  const parts = [
    r.reservation_date ?? r.date ?? r.booking_date,
    r.reservation_time ?? r.time ?? r.booking_time,
  ].filter(Boolean);
  return parts.length ? parts.join(" ") : "";
}

/** Last-resort: show any date-like value from the reservation object */
function getRawDateTime(r) {
  const keys = [
    "reservation_datetime", "datetime", "scheduled_at", "booking_datetime",
    "reservation_date", "date", "reservation_time", "time",
    "booking_date", "booking_time", "scheduled_date", "scheduled_time",
    "created_at", "starts_at", "start_time",
    "reservationDate", "reservationTime", "bookingDate", "bookingTime",
  ];
  for (const k of keys) {
    const v = r?.[k];
    if (v && typeof v === "string") {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleDateString(undefined, {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
      }
    }
  }
  const datePart = (r?.reservation_date ?? r?.date ?? r?.reservationDate ?? "").toString().trim();
  const timePart = (r?.reservation_time ?? r?.time ?? r?.reservationTime ?? "").toString().trim();
  if (datePart || timePart) return [datePart, timePart].filter(Boolean).join(" ");
  return "";
}

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

/** Produce a stable YYYY-MM-DD key from a Date (or null) */
function dateKey(d) {
  if (!d || Number.isNaN(d.getTime())) return "unscheduled";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Short chip label: "Today" / "Tomorrow" / "Sat 23" */
function formatChipLabel(key) {
  if (key === "unscheduled") return "Unscheduled";
  const [y, m, dd] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, dd);
  if (Number.isNaN(dt.getTime())) return key;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((dt.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return dt.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

/** Full section header label: "Saturday, May 23" */
function formatSectionLabel(key) {
  if (key === "unscheduled") return "No date";
  const [y, m, dd] = key.split("-").map(Number);
  const dt = new Date(y, m - 1, dd);
  if (Number.isNaN(dt.getTime())) return key;
  return dt.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
}

const HISTORY_PAGE_SIZE = 10;
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function ReservationsTab({ restaurantId, reservations: reservationsProp, onRefresh }) {
  const { token } = useAuth();
  const [reservations, setReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelTargetId, setCancelTargetId] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [mainTab, setMainTab] = useState("upcoming");
  /** "all" or a YYYY-MM-DD date key */
  const [selectedDate, setSelectedDate] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [cancelledPage, setCancelledPage] = useState(1);

  // Use parent's reservations when provided (enables real-time refresh from OwnerRefreshContext)
  const displayReservations = reservationsProp != null && Array.isArray(reservationsProp)
    ? reservationsProp
    : reservations;

  const loadReservations = useCallback(() => {
    if (!token || !restaurantId) return;
    setLoading(true);
    setError("");
    getOwnerRestaurantReservations(token, restaurantId)
      .then((res) => setReservations(toArray(res)))
      .catch((err) => {
        setError(err?.data?.message || err?.message || "Failed to load reservations");
        setReservations([]);
      })
      .finally(() => setLoading(false));
  }, [token, restaurantId]);

  useEffect(() => {
    if (reservationsProp != null && Array.isArray(reservationsProp)) {
      setLoading(false);
      return;
    }
    loadReservations();
  }, [loadReservations, reservationsProp]);

  async function handleStatusChange(reservationId, newStatus) {
    if (!token || !restaurantId) return;
    if (newStatus === "cancelled") {
      setCancelTargetId(reservationId);
      setCancelReason("");
      setCancelDialogOpen(true);
      return;
    }
    try {
      await updateReservationStatus(token, restaurantId, reservationId, newStatus);
      if (onRefresh) onRefresh();
      else loadReservations();
    } catch (err) {
      setError(err?.data?.message || err?.message || "Failed to update status");
    }
  }

  function closeCancelDialog(force = false) {
    if (cancelSubmitting && !force) return;
    setCancelDialogOpen(false);
    setCancelTargetId(null);
    setCancelReason("");
  }

  async function submitCancellation() {
    if (!token || !restaurantId || !cancelTargetId) return;
    const reason = cancelReason.trim();
    if (!reason) {
      setError("Please provide a cancellation reason.");
      return;
    }
    setError("");
    setCancelSubmitting(true);
    try {
      await updateReservationStatus(token, restaurantId, cancelTargetId, "cancelled", reason);
      closeCancelDialog(true);
      if (onRefresh) onRefresh();
      else loadReservations();
    } catch (err) {
      setError(err?.data?.message || err?.message || "Failed to update status");
    } finally {
      setCancelSubmitting(false);
    }
  }

  if (loading) return <p className="py-8 text-owner-muted">Loading reservations...</p>;
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950">
        <p className="text-red-600 dark:text-red-400">{error}</p>
        <button
          type="button"
          onClick={loadReservations}
          className="touch-manipulation mt-2 min-h-[48px] rounded-xl bg-red-100 px-4 py-3 text-base md:text-sm font-medium text-red-700 dark:bg-red-900/30 dark:text-red-300"
        >
          Try again
        </button>
      </div>
    );
  }

  const now = Date.now();
  const todayStart = (() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t.getTime();
  })();
  const { upcoming, history, cancelled } = (() => {
    const up = [];
    const hist = [];
    const canc = [];
    displayReservations.forEach((r) => {
      // Cancelled reservations get their own bucket regardless of date so
      // they don't clutter the Upcoming list or get buried in History.
      if (r.status === "cancelled") {
        canc.push(r);
        return;
      }
      const d = getReservationDate(r);
      if (!d) {
        up.push(r);
        return;
      }
      const resDateStart = new Date(d);
      resDateStart.setHours(0, 0, 0, 0);
      const isPast =
        resDateStart.getTime() < todayStart ||
        d.getTime() < now;
      if (isPast) {
        hist.push(r);
      } else {
        up.push(r);
      }
    });
    up.sort((a, b) => (getReservationDate(a)?.getTime() ?? 0) - (getReservationDate(b)?.getTime() ?? 0));
    hist.sort((a, b) => (getReservationDate(b)?.getTime() ?? 0) - (getReservationDate(a)?.getTime() ?? 0));
    canc.sort((a, b) => (getReservationDate(b)?.getTime() ?? 0) - (getReservationDate(a)?.getTime() ?? 0));
    return { upcoming: up, history: hist, cancelled: canc };
  })();

  // Group upcoming reservations by date (YYYY-MM-DD)
  const upcomingGroups = (() => {
    const map = new Map();
    upcoming.forEach((r) => {
      const k = dateKey(getReservationDate(r));
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(r);
    });
    const keys = Array.from(map.keys()).sort((a, b) => {
      if (a === "unscheduled") return 1;
      if (b === "unscheduled") return -1;
      return a < b ? -1 : 1;
    });
    return keys.map((k) => ({ key: k, items: map.get(k) }));
  })();

  // If the selected date no longer exists in the data, fall back to "all"
  const effectiveSelectedDate =
    selectedDate === "all" || upcomingGroups.some((g) => g.key === selectedDate)
      ? selectedDate
      : "all";

  const upcomingFiltered =
    effectiveSelectedDate === "all"
      ? upcoming
      : upcomingGroups.find((g) => g.key === effectiveSelectedDate)?.items ?? [];

  const oneWeekAgo = now - ONE_WEEK_MS;
  const historyFiltered = history.filter((r) => {
    const d = getReservationDate(r);
    return d && d.getTime() >= oneWeekAgo;
  });

  const historyTotalPages = Math.max(1, Math.ceil(historyFiltered.length / HISTORY_PAGE_SIZE));
  const historyPaginated = historyFiltered.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  // Cancelled list keeps the same paging behaviour as History but has no
  // 7-day time filter — owners may want to look much further back.
  const cancelledTotalPages = Math.max(1, Math.ceil(cancelled.length / HISTORY_PAGE_SIZE));
  const cancelledPaginated = cancelled.slice(
    (cancelledPage - 1) * HISTORY_PAGE_SIZE,
    cancelledPage * HISTORY_PAGE_SIZE
  );

  const displayList =
    mainTab === "upcoming"
      ? upcomingFiltered
      : mainTab === "cancelled"
      ? cancelledPaginated
      : historyPaginated;

  /** Render a single reservation card (used in both grouped and flat views) */
  function renderReservationCard(r) {
    const d = getReservationDate(r);
    const isPast = d && d.getTime() < now;
    const customerName = r.customer_name ?? r.user?.name ?? "Guest";
    const customerPhone =
      r.confirmation_phone ?? r.customer_phone ?? r.phone ?? r.user?.phone ?? "";
    const customerEmail = r.customer_email ?? r.email ?? r.user?.email ?? "";
    const reservationNotes = r.notes ?? r.special_requests ?? r.note ?? "";
    return (
      <li
        key={r.id}
        className={`rounded-lg border ${
          isPast
            ? "border-owner-border bg-owner-paper"
            : "owner-card border border-owner-border"
        }`}
      >
        {/* Header: name, time, status, guests */}
        <div className="flex items-start justify-between gap-2 px-3 py-2 border-b border-owner-border">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-owner-charcoal truncate">
              {customerName}
            </p>
            <p className="text-[11px] text-owner-muted">
              {getDisplayDateTime(r) || "—"} · {r.party_size ?? 1}{" "}
              {Number(r.party_size) === 1 ? "guest" : "guests"}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span
              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                r.status === "confirmed"
                  ? "bg-owner-success/20 text-owner-success"
                  : r.status === "cancelled"
                  ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300"
                  : r.status === "completed"
                  ? "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300"
                  : "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
              }`}
            >
              {r.status || "pending"}
            </span>
            {!isPast && r.status !== "cancelled" && r.status !== "completed" && (
              <select
                value={r.status || "pending"}
                onChange={(e) => handleStatusChange(r.id, e.target.value)}
                aria-label="Change reservation status"
                className="touch-manipulation h-7 rounded-md border border-owner-border bg-owner-card px-1.5 text-[11px] font-medium text-owner-charcoal"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Body: contact + notes (only if data present) */}
        {(customerPhone || customerEmail || reservationNotes) && (
          <div className="px-3 py-2 space-y-1.5 text-[12px]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              {customerPhone ? (
                <a
                  href={`tel:${String(customerPhone).replace(/\s/g, "")}`}
                  className="inline-flex items-center gap-1 text-owner-charcoal hover:text-owner-action font-medium"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {customerPhone}
                </a>
              ) : null}
              {customerEmail ? (
                <a
                  href={`mailto:${customerEmail}`}
                  className="inline-flex items-center gap-1 text-owner-charcoal hover:text-owner-action font-medium break-all"
                >
                  <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  {customerEmail}
                </a>
              ) : null}
            </div>
            {reservationNotes ? (
              <p className="text-owner-muted">
                <span className="font-medium text-owner-charcoal">Notes:</span> {reservationNotes}
              </p>
            ) : null}
          </div>
        )}
      </li>
    );
  }

  return (
    <>
    <div className="space-y-4 max-w-full min-w-0">
      {/* Main tabs: Upcoming | Cancelled | History */}
      <div className="flex gap-1 rounded-lg bg-owner-paper p-1 border border-owner-border">
        <button
          type="button"
          onClick={() => setMainTab("upcoming")}
          className={`touch-manipulation min-h-[36px] flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors active:scale-[0.98] ${
            mainTab === "upcoming"
              ? "bg-owner-action text-white shadow"
              : "text-owner-charcoal hover:bg-owner-paper"
          }`}
        >
          Upcoming
          {(upcoming.length > 0) && (
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${mainTab === "upcoming" ? "bg-white/20 text-white" : "bg-owner-border text-owner-charcoal"}`}>
              {upcoming.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => { setMainTab("cancelled"); setCancelledPage(1); }}
          className={`touch-manipulation min-h-[36px] flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors active:scale-[0.98] ${
            mainTab === "cancelled"
              ? "bg-owner-action text-white shadow"
              : "text-owner-charcoal hover:bg-owner-paper"
          }`}
        >
          Cancelled
          {(cancelled.length > 0) && (
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${mainTab === "cancelled" ? "bg-white/20 text-white" : "bg-owner-border text-owner-charcoal"}`}>
              {cancelled.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => { setMainTab("history"); setHistoryPage(1); }}
          className={`touch-manipulation min-h-[36px] flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors active:scale-[0.98] ${
            mainTab === "history"
              ? "bg-owner-action text-white shadow"
              : "text-owner-charcoal hover:bg-owner-paper"
          }`}
        >
          History
          {(history.length > 0) && (
            <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[11px] ${mainTab === "history" ? "bg-white/20 text-white" : "bg-owner-border text-owner-charcoal"}`}>
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* Upcoming: horizontal date pill strip (All + each date with reservations) */}
      {mainTab === "upcoming" && upcoming.length > 0 && (
        <div className="-mx-1 overflow-x-auto px-1 pb-0.5" aria-label="Filter reservations by date">
          <div className="flex gap-1.5 min-w-max">
            <button
              type="button"
              onClick={() => setSelectedDate("all")}
              className={`touch-manipulation inline-flex shrink-0 h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors active:scale-[0.98] ${
                effectiveSelectedDate === "all"
                  ? "bg-owner-action text-white shadow"
                  : "border border-owner-border bg-owner-card text-owner-charcoal hover:bg-owner-paper"
              }`}
              aria-pressed={effectiveSelectedDate === "all"}
            >
              All
              <span
                className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                  effectiveSelectedDate === "all"
                    ? "bg-white/20 text-white"
                    : "bg-owner-border text-owner-charcoal"
                }`}
              >
                {upcoming.length}
              </span>
            </button>
            {upcomingGroups.map((g) => {
              const isActive = effectiveSelectedDate === g.key;
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setSelectedDate(g.key)}
                  className={`touch-manipulation inline-flex shrink-0 h-8 items-center gap-1.5 rounded-full px-3 text-xs font-semibold transition-colors active:scale-[0.98] ${
                    isActive
                      ? "bg-owner-action text-white shadow"
                      : "border border-owner-border bg-owner-card text-owner-charcoal hover:bg-owner-paper"
                  }`}
                  aria-pressed={isActive}
                >
                  {formatChipLabel(g.key)}
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-owner-border text-owner-charcoal"
                    }`}
                  >
                    {g.items.length}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* History: Last 7 days + Pagination */}
      {mainTab === "history" && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-owner-muted">Last 7 days</p>
          {(historyFiltered.length > HISTORY_PAGE_SIZE) && (
            <div className="flex items-center gap-2 text-xs text-owner-muted">
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                disabled={historyPage <= 1}
                className="touch-manipulation h-8 min-w-[72px] rounded-lg border border-owner-border px-2.5 font-medium text-owner-charcoal hover:bg-owner-paper disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="font-medium">
                {historyPage} / {historyTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                disabled={historyPage >= historyTotalPages}
                className="touch-manipulation h-8 min-w-[72px] rounded-lg border border-owner-border px-2.5 font-medium text-owner-charcoal hover:bg-owner-paper disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cancelled: subtitle + Pagination */}
      {mainTab === "cancelled" && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-owner-muted">All cancelled reservations</p>
          {(cancelled.length > HISTORY_PAGE_SIZE) && (
            <div className="flex items-center gap-2 text-xs text-owner-muted">
              <button
                type="button"
                onClick={() => setCancelledPage((p) => Math.max(1, p - 1))}
                disabled={cancelledPage <= 1}
                className="touch-manipulation h-8 min-w-[72px] rounded-lg border border-owner-border px-2.5 font-medium text-owner-charcoal hover:bg-owner-paper disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="font-medium">
                {cancelledPage} / {cancelledTotalPages}
              </span>
              <button
                type="button"
                onClick={() => setCancelledPage((p) => Math.min(cancelledTotalPages, p + 1))}
                disabled={cancelledPage >= cancelledTotalPages}
                className="touch-manipulation h-8 min-w-[72px] rounded-lg border border-owner-border px-2.5 font-medium text-owner-charcoal hover:bg-owner-paper disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {displayList.length === 0 ? (
        <p className="py-6 text-sm text-owner-muted">
          {mainTab === "history"
            ? "No past reservations."
            : mainTab === "cancelled"
            ? "No cancelled reservations."
            : effectiveSelectedDate !== "all"
            ? `No reservations on ${formatChipLabel(effectiveSelectedDate)}.`
            : "No upcoming reservations."}
        </p>
      ) : mainTab === "upcoming" && effectiveSelectedDate === "all" && upcomingGroups.length > 0 ? (
        <div className="space-y-4">
          {upcomingGroups.map((g) => (
            <section key={g.key} className="space-y-2">
              <div className="flex items-baseline justify-between gap-2 border-b border-owner-border pb-1">
                <h3 className="text-xs font-semibold text-owner-charcoal">
                  {formatSectionLabel(g.key)}
                  <span className="ml-1.5 text-[11px] font-normal text-owner-muted">
                    · {g.items.length}
                  </span>
                </h3>
                <span className="text-[10px] uppercase tracking-wider text-owner-muted">
                  {formatChipLabel(g.key)}
                </span>
              </div>
              <ul className="space-y-2">
                {g.items.map((r) => renderReservationCard(r))}
              </ul>
            </section>
          ))}
        </div>
      ) : (
        <ul className="space-y-2">
          {displayList.map((r) => renderReservationCard(r))}
        </ul>
      )}
    </div>

    {cancelDialogOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="owner-animate-modal-backdrop absolute inset-0 bg-black/50" aria-hidden />
        <div className="owner-animate-modal-center relative w-full max-w-md rounded-xl border border-owner-border bg-owner-card p-4 shadow-xl">
          <h3 className="text-lg font-semibold text-owner-charcoal">Cancel Reservation</h3>
          <p className="mt-1 text-sm text-owner-muted">
            Please enter the cancellation reason. This will be sent to the API and saved.
          </p>
          <label className="mt-3 block text-sm font-medium text-owner-charcoal">
            Cancellation reason
          </label>
          <textarea
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Reason for cancellation..."
            rows={4}
            className="mt-1 w-full rounded-lg border border-owner-border bg-white px-3 py-2 text-sm text-owner-charcoal outline-none focus:border-owner-action"
          />
          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={closeCancelDialog}
              disabled={cancelSubmitting}
              className="touch-manipulation min-h-[44px] rounded-lg border border-owner-border px-4 py-2 text-sm font-medium text-owner-charcoal hover:bg-owner-paper disabled:opacity-60"
            >
              Close
            </button>
            <button
              type="button"
              onClick={submitCancellation}
              disabled={cancelSubmitting}
              className="touch-manipulation min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-60"
            >
              {cancelSubmitting ? "Cancelling..." : "Confirm cancel"}
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
