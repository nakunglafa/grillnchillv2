"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getRestaurantOrders,
  getOwnerRestaurantReservations,
  updateOrderStatus,
  updateReservationStatus,
} from "@/lib/api";
import { toArray } from "@/lib/owner-utils";
import { useOwnerRefresh } from "@/context/OwnerRefreshContext";

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || "9";

const ORDER_STATUS_OPTIONS = [
  { value: "pending_confirmation", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "rejected", label: "Rejected" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

const RESERVATION_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "completed", label: "Completed" },
];

function getOrderTotal(order) {
  const o = order?.order ?? order;
  const total = o?.total ?? o?.total_amount ?? o?.order_total ?? o?.amount ?? 0;
  return typeof total === "number" ? total : parseFloat(total) || 0;
}

function getReservationDate(r) {
  const res = r?.reservation ?? r;
  const dateStr = (res?.reservation_date ?? res?.date ?? "").toString().trim();
  const timeStr = (res?.reservation_time ?? res?.time ?? "").toString().trim();

  // Prefer explicit date+time fields so 19:00 stays 19:00 (no timezone conversion).
  if (dateStr) {
    const normalizedDate = dateStr.replace(/^(\d{4})-(\d{2})-(\d{2}).*/, "$1-$2-$3");
    let normalizedTime = timeStr.replace(/\.\d+Z?$/i, "").slice(0, 8);
    if (!normalizedTime) normalizedTime = "00:00:00";
    if (normalizedTime.length === 5) normalizedTime += ":00";
    const [y, m, d] = normalizedDate.split("-").map(Number);
    const [h = 0, min = 0, sec = 0] = normalizedTime.split(":").map(Number);
    const localDate = new Date(y, m - 1, d, h, min, sec);
    if (!Number.isNaN(localDate.getTime())) return localDate;
  }

  const iso = res?.reservation_datetime ?? res?.datetime;
  if (iso && typeof iso === "string") {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const { registerRefresh } = useOwnerRefresh();
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentReservations, setRecentReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [updatingReservationId, setUpdatingReservationId] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null); // { type: "order" | "reservation", id }

  const loadDashboardData = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    Promise.all([
      getRestaurantOrders(token, RESTAURANT_ID),
      getOwnerRestaurantReservations(token, RESTAURANT_ID),
    ])
      .then(([ordersRes, reservationsRes]) => {
        const orders = toArray(ordersRes);
        const reservations = toArray(reservationsRes);
        const sortedOrders = [...orders].sort((a, b) => {
          const da = new Date(a?.created_at ?? a?.order?.created_at ?? 0).getTime();
          const db = new Date(b?.created_at ?? b?.order?.created_at ?? 0).getTime();
          return db - da;
        });
        const sortedReservations = [...reservations].sort((a, b) => {
          const da = (getReservationDate(a) || new Date(0)).getTime();
          const db = (getReservationDate(b) || new Date(0)).getTime();
          return db - da;
        });
        setRecentOrders(sortedOrders.slice(0, 5));
        setRecentReservations(sortedReservations.slice(0, 5));
      })
      .catch((err) => {
        setError(err?.data?.message || err?.message || "Failed to load dashboard");
        setRecentOrders([]);
        setRecentReservations([]);
      })
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/owner/dashboard");
      return;
    }
    if (token) loadDashboardData();
  }, [token, authLoading, isAuthenticated, router, loadDashboardData]);

  useEffect(() => {
    return registerRefresh(loadDashboardData);
  }, [registerRefresh, loadDashboardData]);

  async function handleOrderStatusChange(orderId, newStatus) {
    if (!token || !orderId) return;
    if (newStatus === "cancelled") {
      setCancelTarget({ type: "order", id: orderId });
      setCancelReason("");
      setCancelDialogOpen(true);
      return;
    }
    const previousOrders = recentOrders;
    setUpdatingOrderId(orderId);
    setRecentOrders((prev) =>
      prev.map((order) =>
        (order?.order?.id ?? order?.id) === orderId ? { ...order, status: newStatus } : order
      )
    );
    try {
      await updateOrderStatus(token, RESTAURANT_ID, orderId, newStatus);
      loadDashboardData();
    } catch (err) {
      setRecentOrders(previousOrders);
      setError(err?.data?.message || err?.message || "Failed to update order status");
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function handleReservationStatusChange(reservationId, newStatus) {
    if (!token || !reservationId) return;
    if (newStatus === "cancelled") {
      setCancelTarget({ type: "reservation", id: reservationId });
      setCancelReason("");
      setCancelDialogOpen(true);
      return;
    }
    const previousReservations = recentReservations;
    setUpdatingReservationId(reservationId);
    setRecentReservations((prev) =>
      prev.map((res) =>
        (res?.reservation?.id ?? res?.id) === reservationId ? { ...res, status: newStatus } : res
      )
    );
    try {
      await updateReservationStatus(token, RESTAURANT_ID, reservationId, newStatus);
      loadDashboardData();
    } catch (err) {
      setRecentReservations(previousReservations);
      setError(err?.data?.message || err?.message || "Failed to update reservation status");
    } finally {
      setUpdatingReservationId(null);
    }
  }

  function closeCancelDialog(force = false) {
    if (cancelSubmitting && !force) return;
    setCancelDialogOpen(false);
    setCancelReason("");
    setCancelTarget(null);
  }

  async function submitCancellation() {
    const reason = cancelReason.trim();
    if (!token || !cancelTarget?.id) return;
    if (!reason) {
      setError("Cancellation reason is required.");
      return;
    }
    setError("");
    setCancelSubmitting(true);
    try {
      if (cancelTarget.type === "order") {
        await updateOrderStatus(token, RESTAURANT_ID, cancelTarget.id, "cancelled", reason);
      } else {
        await updateReservationStatus(token, RESTAURANT_ID, cancelTarget.id, "cancelled", reason);
      }
      closeCancelDialog(true);
      loadDashboardData();
    } catch (err) {
      setError(err?.data?.message || err?.message || "Failed to cancel item");
    } finally {
      setCancelSubmitting(false);
    }
  }

  if (authLoading || !isAuthenticated) return null;

  const totalRevenue = recentOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
  const salesByDay = recentOrders.reduce((acc, order) => {
    const o = order?.order ?? order;
    const date = o?.created_at ?? order?.created_at;
    const d = date ? new Date(date).toLocaleDateString() : "Unknown";
    acc[d] = (acc[d] || 0) + getOrderTotal(order);
    return acc;
  }, {});
  const maxDayRevenue = Math.max(...Object.values(salesByDay), 1);

  const iconClass = "text-owner-success";
  const iconSize = 20;

  return (
    <>
    <div className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-owner-charcoal">
          Dashboard
        </h1>
        <Link
          href={`/owner/dashboard/${RESTAURANT_ID}`}
          className="inline-flex items-center gap-2 rounded-lg bg-owner-action px-4 py-2.5 text-sm font-medium text-white hover:opacity-90 transition-opacity"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 opacity-90">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          Manage restaurant
        </Link>
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Metrics overview */}
      <section className="mb-8">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="owner-card rounded-lg p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-owner-muted">Recent Revenue</p>
              <p className="mt-1.5 text-2xl font-bold text-owner-charcoal">
                €{totalRevenue.toFixed(2)}
              </p>
              <p className="mt-1 text-[11px] text-owner-muted">From last 5 orders</p>
            </div>
            <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-owner-success/20 ${iconClass}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
          </div>
          <div className="owner-card rounded-lg p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-owner-muted">Recent Orders</p>
              <p className="mt-1.5 text-2xl font-bold text-owner-charcoal">
                {recentOrders.length}
              </p>
              <p className="mt-1 text-[11px] text-owner-muted">Latest 5</p>
            </div>
            <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-owner-success/20 ${iconClass}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
          </div>
          <div className="owner-card rounded-lg p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-owner-muted">Recent Bookings</p>
              <p className="mt-1.5 text-2xl font-bold text-owner-charcoal">
                {recentReservations.length}
              </p>
              <p className="mt-1 text-[11px] text-owner-muted">Latest 5</p>
            </div>
            <div className={`flex h-8 w-8 items-center justify-center rounded-md bg-owner-success/20 ${iconClass}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
          </div>
        </div>

        {/* Sales by day */}
        {Object.keys(salesByDay).length > 0 && (
          <div className="owner-card mt-4 rounded-lg p-5">
            <h3 className="mb-3 text-sm font-semibold text-owner-charcoal">Sales by day</h3>
            <div className="space-y-2.5">
              {Object.entries(salesByDay).map(([day, revenue]) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-24 shrink-0 text-xs text-owner-muted">{day}</span>
                  <div className="min-w-0 flex-1 h-5 overflow-hidden rounded-sm bg-owner-paper">
                    <div
                      className="h-full min-w-[4px] rounded-sm bg-owner-success/80"
                      style={{ width: `${(revenue / maxDayRevenue) * 100}%` }}
                    />
                  </div>
                  <span className="w-16 shrink-0 text-right text-xs font-medium text-owner-charcoal">
                    €{revenue.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Recent orders */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-owner-charcoal">
              Recent orders
            </h2>
            <Link
              href={`/owner/dashboard/${RESTAURANT_ID}`}
              className="text-sm font-medium text-owner-action hover:opacity-80"
            >
              View all →
            </Link>
          </div>
          <div className="owner-card rounded-xl">
            {loading ? (
              <div className="p-8 text-center text-owner-muted">Loading...</div>
            ) : recentOrders.length === 0 ? (
              <div className="p-8 text-center text-owner-muted">No recent orders</div>
            ) : (
              <ul className="divide-y divide-owner-border">
                {recentOrders.map((order) => {
                  const o = order?.order ?? order;
                  const total = getOrderTotal(order);
                  const date = o?.created_at ?? order?.created_at;
                  const status = o?.status ?? order?.status ?? "—";
                  const orderId = o?.id ?? order?.id;
                  return (
                    <li key={orderId} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-owner-charcoal">
                          Order #{orderId}
                        </p>
                        <p className="text-sm text-owner-muted">
                          {date ? new Date(date).toLocaleString() : "—"} · {String(status).replace(/_/g, " ")}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-owner-charcoal">
                          €{total.toFixed(2)}
                        </p>
                        <select
                          value={status}
                          onChange={(e) => handleOrderStatusChange(orderId, e.target.value)}
                          disabled={updatingOrderId === orderId}
                          className="touch-manipulation min-h-[40px] rounded-lg border border-owner-border bg-owner-card px-2 py-1 text-xs text-owner-charcoal disabled:opacity-60"
                        >
                          {ORDER_STATUS_OPTIONS.map((s) => (
                            <option key={s.value} value={s.value}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>

        {/* Recent bookings */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-owner-charcoal">
              Recent bookings
            </h2>
            <Link
              href={`/owner/dashboard/${RESTAURANT_ID}`}
              className="text-sm font-medium text-owner-action hover:opacity-80"
            >
              View all →
            </Link>
          </div>
          <div className="owner-card rounded-xl">
            {loading ? (
              <div className="p-8 text-center text-owner-muted">Loading...</div>
            ) : recentReservations.length === 0 ? (
              <div className="p-8 text-center text-owner-muted">No recent bookings</div>
            ) : (
              <ul className="divide-y divide-owner-border">
                {recentReservations.map((res) => {
                  const r = res?.reservation ?? res;
                  const name = r?.customer_name ?? r?.user?.name ?? "Guest";
                  const date = getReservationDate(res);
                  const status = r?.status ?? "—";
                  const reservationId = r?.id ?? res?.id;
                  return (
                    <li key={reservationId} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="font-medium text-owner-charcoal">{name}</p>
                        <p className="text-sm text-owner-muted">
                          {date ? date.toLocaleString() : "—"} · {String(status).replace(/_/g, " ")}
                        </p>
                      </div>
                      <select
                        value={status}
                        onChange={(e) => handleReservationStatusChange(reservationId, e.target.value)}
                        disabled={updatingReservationId === reservationId}
                        className="touch-manipulation min-h-[40px] rounded-lg border border-owner-border bg-owner-card px-2 py-1 text-xs text-owner-charcoal disabled:opacity-60"
                      >
                        {RESERVATION_STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
    {cancelDialogOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="w-full max-w-md rounded-xl border border-owner-border bg-owner-card p-4 shadow-xl">
          <h3 className="text-lg font-semibold text-owner-charcoal">Cancellation reason required</h3>
          <p className="mt-1 text-sm text-owner-muted">
            Please enter the reason for cancellation before continuing.
          </p>
          <label className="mt-3 block text-sm font-medium text-owner-charcoal">
            Reason
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
              onClick={() => closeCancelDialog(false)}
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
