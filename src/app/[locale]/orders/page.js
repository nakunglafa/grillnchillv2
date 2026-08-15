"use client";

import { useLocalizedPath } from "@/lib/use-locale";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { getOrders } from "@/lib/api";
import { OrderNotificationModal } from "@/components/OrderNotificationModal";
import { toArray, getOrderLineItems, getLineItemDisplayName, getLineItemRowTotal } from "@/lib/owner-utils";
import { formatCurrencyEURZero as formatPrice } from "@/lib/format-currency";

function formatStatus(s) {
  if (!s || typeof s !== "string") return s;
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const PENDING_STATUSES = ["pending", "pending_confirmation", "new"];
function hasPendingOrders(orders) {
  return Array.isArray(orders) && orders.some((o) => {
    const s = (o?.status || "").toLowerCase();
    return PENDING_STATUSES.some((p) => s.includes(p) || p.includes(s));
  });
}

// Active = in progress. Finished (separate filter) = delivered, cancelled, rejected.
const ACTIVE_STATUSES = ["pending", "pending_confirmation", "new", "confirmed", "preparing", "ready_for_pickup", "out_for_delivery"];

function isActiveOrder(order) {
  const s = (order?.status ?? order?.order_status ?? "").toLowerCase().replace(/\s+/g, "_");
  return ACTIVE_STATUSES.some((p) => s.includes(p) || p.includes(s));
}

function normalizeStatus(s) {
  return (s ?? "").toLowerCase().replace(/\s+/g, "_");
}

/** Delivered, cancelled, rejected — "done" orders for the Finished filter */
function isFinishedOrder(order) {
  const s = normalizeStatus(order?.status ?? order?.order_status);
  if (!s) return false;
  return (
    s === "delivered" ||
    s === "cancelled" ||
    s === "rejected" ||
    s.includes("delivered") ||
    s.includes("cancelled") ||
    s.includes("rejected")
  );
}

const ORDER_VIEW = {
  ACTIVE: "active",
  FINISHED: "finished",
  ALL: "all",
};

function getStatusBadgeClass(status) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("pending") || s.includes("new")) return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
  if (s.includes("confirmed") || s.includes("preparing")) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (s.includes("ready") || s.includes("delivery")) return "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300";
  if (s.includes("delivered")) return "bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
  if (s.includes("cancelled") || s.includes("rejected")) return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
  return "bg-zinc-100 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300";
}

export default function OrdersPage() {
  const lp = useLocalizedPath();
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notificationDismissed, setNotificationDismissed] = useState(false);
  const [orderView, setOrderView] = useState(ORDER_VIEW.ACTIVE);
  const pollIntervalRef = useRef(null);

  const load = useCallback((showLoading = true) => {
    if (!token) return;
    if (showLoading) {
      setError("");
      setLoading(true);
    }
    getOrders(token)
      .then((data) => {
        const arr = toArray(data);
        setOrders(arr);
        if (!hasPendingOrders(arr)) setNotificationDismissed(false);
      })
      .catch((err) => {
        if (showLoading) {
          setError(err?.message || err?.data?.message || "Failed to load orders");
          setOrders([]);
        }
      })
      .finally(() => { if (showLoading) setLoading(false); });
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!token || !isAuthenticated) return;
    pollIntervalRef.current = setInterval(() => {
      getOrders(token)
        .then((data) => {
          const arr = toArray(data);
          setOrders(arr);
          if (!hasPendingOrders(arr)) setNotificationDismissed(false);
        })
        .catch(() => {});
    }, 10000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [token, isAuthenticated]);

  // Filter: Active (in progress) | Finished (delivered / cancelled / rejected) | All
  const filteredOrders = orders.filter((o) => {
    if (orderView === ORDER_VIEW.ACTIVE) return isActiveOrder(o);
    if (orderView === ORDER_VIEW.FINISHED) return isFinishedOrder(o);
    return true;
  });

  const activeCount = orders.filter(isActiveOrder).length;
  const finishedCount = orders.filter(isFinishedOrder).length;

  if (authLoading) {
    return (
      <div className="relative min-h-screen bg-[#0a0908] text-white">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[min(40vh,420px)] bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,rgba(197,157,95,0.09),transparent_55%)]"
          aria-hidden
        />
        <Header variant="marketing" />
        <main className="relative z-10 mx-auto max-w-5xl px-4 py-12">
          <p className="text-center text-white/60">Loading…</p>
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen bg-[#0a0908] text-white">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[min(40vh,420px)] bg-[radial-gradient(ellipse_80%_70%_at_50%_0%,rgba(197,157,95,0.09),transparent_55%)]"
          aria-hidden
        />
        <Header variant="marketing" />
        <main className="relative z-10 mx-auto max-w-5xl px-4 py-12">
          <p className="text-center text-white/65">
            Please <Link href={lp("/login")} className="text-accent hover:underline">log in</Link> to view your orders.
          </p>
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
      <main className="relative z-10 mx-auto max-w-5xl px-4 py-8 md:py-12">
        <h1 className="mb-6 font-display text-2xl font-semibold text-white">My Orders</h1>

        {error && (
          <div className="mb-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 ring-1 ring-red-500/20">
            <p className="text-red-200">{error}</p>
            <button type="button" onClick={() => load(true)} className="mt-2 text-sm font-medium text-red-200 hover:underline">
              Try again
            </button>
          </div>
        )}

        {loading && <p className="py-8 text-center text-white/60">Loading orders…</p>}

        {!loading && !error && orders.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-12 text-center shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm">
            <p className="text-white/70">No orders yet.</p>
            <Link
              href={lp("/menu")}
              className="mt-4 inline-flex min-h-[48px] items-center justify-center rounded-sm bg-accent px-6 py-3 text-sm font-semibold uppercase tracking-[0.16em] text-wood-950 transition-colors hover:bg-accent-hover"
            >
              Browse menu
            </Link>
          </div>
        )}

        {!loading && !error && orders.length > 0 && (
          <div className="min-w-0 space-y-6">
            {/* Single row: Active | Finished | All */}
            <div
              className="flex gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-1.5 backdrop-blur-sm"
              role="tablist"
              aria-label="Order list"
            >
              <button
                type="button"
                role="tab"
                aria-selected={orderView === ORDER_VIEW.ACTIVE}
                onClick={() => setOrderView(ORDER_VIEW.ACTIVE)}
                className={`touch-manipulation min-h-[48px] flex-1 rounded-lg px-2 py-3 text-sm font-semibold transition-colors active:scale-[0.98] sm:px-3 sm:text-base ${
                  orderView === ORDER_VIEW.ACTIVE
                    ? "bg-accent text-wood-950 shadow"
                    : "text-white/65 hover:text-white"
                }`}
              >
                Active
                {activeCount > 0 && (
                  <span className="ml-1 rounded-full bg-black/20 px-1.5 py-0.5 text-xs font-medium text-current tabular-nums sm:ml-1.5">
                    {activeCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={orderView === ORDER_VIEW.FINISHED}
                onClick={() => setOrderView(ORDER_VIEW.FINISHED)}
                className={`touch-manipulation min-h-[48px] flex-1 rounded-lg px-2 py-3 text-sm font-semibold transition-colors active:scale-[0.98] sm:px-3 sm:text-base ${
                  orderView === ORDER_VIEW.FINISHED
                    ? "bg-accent text-wood-950 shadow"
                    : "text-white/65 hover:text-white"
                }`}
              >
                Finished
                {finishedCount > 0 && (
                  <span className="ml-1 rounded-full bg-black/20 px-1.5 py-0.5 text-xs text-current tabular-nums sm:ml-1.5">
                    {finishedCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={orderView === ORDER_VIEW.ALL}
                onClick={() => setOrderView(ORDER_VIEW.ALL)}
                className={`touch-manipulation min-h-[48px] flex-1 rounded-lg px-2 py-3 text-sm font-semibold transition-colors active:scale-[0.98] sm:px-3 sm:text-base ${
                  orderView === ORDER_VIEW.ALL
                    ? "bg-accent text-wood-950 shadow"
                    : "text-white/65 hover:text-white"
                }`}
              >
                All
                {orders.length > 0 && (
                  <span className="ml-1 rounded-full bg-black/20 px-1.5 py-0.5 text-xs text-current tabular-nums sm:ml-1.5">
                    {orders.length}
                  </span>
                )}
              </button>
            </div>

            {filteredOrders.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm">
                <p className="text-white/70">
                  {orderView === ORDER_VIEW.ACTIVE && "No active orders."}
                  {orderView === ORDER_VIEW.FINISHED && "No finished orders yet."}
                  {orderView === ORDER_VIEW.ALL && "No orders to show."}
                </p>
                <p className="mt-1 text-sm text-white/45">Try another tab above.</p>
              </div>
            ) : (
              <ul className="space-y-4">
                {filteredOrders.map((order) => {
                  const lineItems = getOrderLineItems(order);
                  return (
                  <li key={order.id} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.35)] ring-1 ring-white/10 backdrop-blur-sm">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <span className="text-lg font-bold text-white">Order #{order.id}</span>
                        {order.restaurant_name && (
                          <p className="mt-0.5 text-sm text-white/60">{order.restaurant_name}</p>
                        )}
                        {order.created_at && (
                          <p className="mt-1 text-sm text-white/45">{new Date(order.created_at).toLocaleString()}</p>
                        )}
                        {(order.estimated_ready_minutes != null || order.estimated_ready_at) && (
                          <p className="mt-2 rounded-lg border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100/95">
                            <span className="font-semibold text-emerald-200">Estimated ready</span>
                            {order.estimated_ready_minutes != null ? ` · ~${order.estimated_ready_minutes} min` : ""}
                            {order.estimated_ready_at
                              ? ` · by ${new Date(order.estimated_ready_at).toLocaleString(undefined, {
                                  dateStyle: "medium",
                                  timeStyle: "short",
                                })}`
                              : ""}
                          </p>
                        )}
                      </div>
                      <span
                        className={`inline-flex shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadgeClass(
                          order.status ?? order.order_status
                        )}`}
                      >
                        {formatStatus(order.status ?? order.order_status)}
                      </span>
                    </div>
                    {lineItems.length > 0 && (
                      <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.02]">
                        <p className="border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/50">
                          Items
                        </p>
                        <ul className="divide-y divide-white/10">
                          {lineItems.map((line, idx) => {
                            const rowTotal = getLineItemRowTotal(line);
                            return (
                              <li key={line.id ?? line.order_item_id ?? idx} className="flex justify-between gap-3 px-3 py-2 text-sm">
                                <span className="min-w-0 text-white/85">
                                  {getLineItemDisplayName(line)} × {Number(line.quantity) || 1}
                                </span>
                                <span className="shrink-0 text-white/55">{formatPrice(rowTotal)}</span>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                      <span className="font-semibold text-white">{formatPrice(order.total ?? order.total_amount)}</span>
                      {lineItems.length > 0 && (
                        <span className="text-sm text-white/45">
                          {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
                        </span>
                      )}
                    </div>
                  </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        <OrderNotificationModal
          orders={orders}
          visible={hasPendingOrders(orders) && !notificationDismissed}
          onDismiss={() => setNotificationDismissed(true)}
        />
      </main>
    </div>
  );
}
