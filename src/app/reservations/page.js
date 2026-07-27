"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { getReservations, cancelReservation } from "@/lib/api";

const CANCEL_WINDOW_MS = 24 * 60 * 60 * 1000;

/**
 * Get a Date for the reservation (for sorting or display).
 * Handles: full ISO in any field, or reservation_date + reservation_time separately.
 */
function getReservationDate(r) {
  const possibleIso =
    r.reservation_datetime ?? r.datetime ?? r.date_time ?? r.reservation_date ?? r.date ?? r.reservation_time ?? r.time;
  if (possibleIso && typeof possibleIso === "string" && possibleIso.includes("T")) {
    const d = new Date(possibleIso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const dateStr = (r.reservation_date ?? r.date ?? "").toString().trim();
  const timeStr = (r.reservation_time ?? r.time ?? "").toString().trim();
  if (!dateStr) return null;
  if (dateStr.includes("T")) {
    const d = new Date(dateStr);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const normalizedDate = dateStr.replace(/^(\d{4})-(\d{2})-(\d{2}).*/, "$1-$2-$3");
  if (!normalizedDate || normalizedDate.length < 10) return null;
  let timePart = timeStr ? timeStr.replace(/\.\d+Z?$/i, "").replace(/:$/, "").slice(0, 8) : "00:00:00";
  if (timePart && timePart.length === 5) timePart += ":00";
  const combined = `${normalizedDate}T${timePart || "00:00:00"}`;
  const d = new Date(combined);
  return Number.isNaN(d.getTime()) ? new Date(normalizedDate) : d;
}

/** Format reservation date/time for display in local time, e.g. "Friday, 6 March 2026 at 2:30 pm" */
function formatReservationDateTime(r) {
  const d = getReservationDate(r);
  if (!d || Number.isNaN(d.getTime())) return "";
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

/** e.g. "confirmed" → "Confirmed" */
function formatStatus(status) {
  if (!status || typeof status !== "string") return status;
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

function isCancelledStatus(status) {
  const s = String(status || "").toLowerCase();
  return s === "cancelled" || s === "canceled";
}

/** Free online cancel if reservation starts more than 24 hours from now. */
function canCancelOnline(r, nowMs = Date.now()) {
  if (isCancelledStatus(r?.status)) return false;
  const d = getReservationDate(r);
  if (!d || Number.isNaN(d.getTime())) return false;
  return d.getTime() - nowMs > CANCEL_WINDOW_MS;
}

const TAB_UPCOMING = "upcoming";
const TAB_PAST = "past";

export default function ReservationsPage() {
  const router = useRouter();
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState(TAB_UPCOMING);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [cancelError, setCancelError] = useState("");

  const loadReservations = useCallback(() => {
    if (!token) return;
    setError("");
    setLoading(true);
    getReservations(token)
      .then((data) => {
        const items = Array.isArray(data) ? data : data?.data ?? data?.reservations ?? [];
        setList(Array.isArray(items) ? items : []);
      })
      .catch((err) => {
        const message = err?.message || err?.data?.message || "Failed to load reservations";
        setError(message);
        setList([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push("/login");
      return;
    }
    if (!token) return;
    loadReservations();
  }, [token, isAuthenticated, authLoading, router, loadReservations]);

  const now = Date.now();
  const getTime = (r) => (getReservationDate(r) || new Date(0)).getTime();
  const { upcoming, past } = (() => {
    const up = [];
    const pa = [];
    list.forEach((r) => {
      const d = getReservationDate(r);
      if (d && d.getTime() >= now && !isCancelledStatus(r.status)) up.push(r);
      else pa.push(r);
    });
    up.sort((a, b) => getTime(a) - getTime(b));
    pa.sort((a, b) => getTime(b) - getTime(a));
    return { upcoming: up, past: pa };
  })();

  const displayList = activeTab === TAB_UPCOMING ? upcoming : past;

  async function handleConfirmCancel() {
    if (!cancelTarget || !token) return;
    if (!canCancelOnline(cancelTarget)) {
      setCancelError("Online cancellation is only available more than 24 hours before your reservation. Please contact the restaurant.");
      return;
    }
    setCancelling(true);
    setCancelError("");
    try {
      await cancelReservation(token, cancelTarget.id, cancelReason);
      setCancelTarget(null);
      setCancelReason("");
      loadReservations();
    } catch (err) {
      setCancelError(
        err?.data?.message ||
          (err?.data?.errors ? Object.values(err.data.errors).flat().join(" ") : null) ||
          err?.message ||
          "Could not cancel this reservation. Please try again or contact the restaurant."
      );
    } finally {
      setCancelling(false);
    }
  }

  if (authLoading) return null;
  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-wood-100">
      <Header />
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="mb-2 text-2xl font-bold text-wood-900">My reservations</h1>
        <p className="mb-6 text-sm text-wood-600">
          Free online cancellation up to 24 hours before your reservation. Within 24 hours, please contact the restaurant.
        </p>
        {error && (
          <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <p className="text-red-300">{error}</p>
            <button type="button" onClick={loadReservations} className="mt-2 text-sm font-medium text-red-300 underline hover:text-red-200">
              Try again
            </button>
          </div>
        )}
        {loading ? (
          <p className="text-wood-600">Loading...</p>
        ) : !error && list.length === 0 ? (
          <p className="text-wood-600">No reservations yet.</p>
        ) : !error ? (
          <>
            <div className="mb-4 flex gap-1 rounded-lg bg-white/10 p-1.5 border border-white/10 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setActiveTab(TAB_UPCOMING)}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === TAB_UPCOMING ? "bg-white/20 text-wood-900 shadow" : "text-wood-600 hover:text-wood-900"
                }`}
              >
                Upcoming
                {upcoming.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-wood-500/30 px-1.5 py-0.5 text-xs text-wood-900">
                    {upcoming.length}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab(TAB_PAST)}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === TAB_PAST ? "bg-white/20 text-wood-900 shadow" : "text-wood-600 hover:text-wood-900"
                }`}
              >
                Past
                {past.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-wood-500/30 px-1.5 py-0.5 text-xs text-wood-900">
                    {past.length}
                  </span>
                )}
              </button>
            </div>
            {displayList.length === 0 ? (
              <p className="py-6 text-wood-600">
                {activeTab === TAB_UPCOMING ? "No upcoming reservations." : "No past reservations."}
              </p>
            ) : (
              <ul className="space-y-4">
                {displayList.map((r) => {
                  const cancellable = activeTab === TAB_UPCOMING && canCancelOnline(r, now);
                  const within24h =
                    activeTab === TAB_UPCOMING &&
                    !isCancelledStatus(r.status) &&
                    !cancellable &&
                    getReservationDate(r) &&
                    getReservationDate(r).getTime() >= now;
                  return (
                    <li key={r.id} className="glass rounded-xl border border-white/10 p-5">
                      <p className="font-semibold text-wood-900">{r.restaurant?.name ?? `Restaurant #${r.restaurant_id}`}</p>
                      <p className="mt-1 text-wood-600">{formatReservationDateTime(r)}</p>
                      <p className="mt-0.5 text-sm text-wood-500">{Number(r.party_size) === 1 ? "1 guest" : `${r.party_size} guests`}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                            isCancelledStatus(r.status)
                              ? "bg-red-500/20 text-red-200"
                              : "bg-emerald-500/20 text-emerald-200"
                          }`}
                        >
                          {formatStatus(r.status)}
                        </span>
                        {cancellable ? (
                          <button
                            type="button"
                            onClick={() => {
                              setCancelError("");
                              setCancelReason("");
                              setCancelTarget(r);
                            }}
                            className="rounded-lg border border-red-400/40 bg-red-500/10 px-3 py-1.5 text-sm font-medium text-red-200 transition-colors hover:bg-red-500/20"
                          >
                            Cancel reservation
                          </button>
                        ) : null}
                        {within24h ? (
                          <span className="text-xs text-wood-500">
                            Within 24 hours — please contact the restaurant to cancel.
                          </span>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        ) : null}
        <p className="mt-6">
          <Link href="/book" className="text-wood-600 underline hover:text-wood-900">Book another table</Link>
        </p>
      </main>

      {cancelTarget ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-reservation-title"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-wood-100 p-6 shadow-2xl">
            <h2 id="cancel-reservation-title" className="text-lg font-semibold text-wood-900">
              Cancel reservation?
            </h2>
            <p className="mt-2 text-sm text-wood-600">
              {formatReservationDateTime(cancelTarget)}
              {" · "}
              {Number(cancelTarget.party_size) === 1 ? "1 guest" : `${cancelTarget.party_size} guests`}
            </p>
            <p className="mt-3 text-xs text-wood-500">
              Free cancellation is available more than 24 hours before your reservation time.
            </p>
            <label className="mt-4 block text-sm font-medium text-wood-700">
              Reason (optional)
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                className="mt-1 w-full rounded-xl border border-wood-400/40 bg-white/60 px-3 py-2 text-wood-900"
                placeholder="Tell us why you're cancelling…"
              />
            </label>
            {cancelError ? (
              <p className="mt-3 text-sm font-medium text-red-600">{cancelError}</p>
            ) : null}
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                disabled={cancelling}
                onClick={() => {
                  setCancelTarget(null);
                  setCancelReason("");
                  setCancelError("");
                }}
                className="flex-1 rounded-xl border border-wood-400/40 px-4 py-2.5 text-sm font-medium text-wood-800 hover:bg-white/40 disabled:opacity-50"
              >
                Keep reservation
              </button>
              <button
                type="button"
                disabled={cancelling}
                onClick={handleConfirmCancel}
                className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-500 disabled:opacity-50"
              >
                {cancelling ? "Cancelling…" : "Confirm cancel"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
