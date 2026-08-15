"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { getRestaurantOrders, updateOrderStatus } from "@/lib/api";
import { Toast } from "@/components/Toast";
import { toArray, getOrderLineItems, getLineItemDisplayName, getLineItemRowTotal } from "@/lib/owner-utils";
import { formatCurrencyEUROrDash as formatPrice } from "@/lib/format-currency";
import { EstimatedReadyMinutesForm } from "@/components/owner/EstimatedReadyMinutesForm";
import { printOrderKitchenReceipt } from "@/lib/order-receipt-print";
import {
  parseCustomCakeFlavorSize,
  parseCustomCakeSampleUrl,
  stripCustomCakeSampleLine,
} from "@/lib/cake-order";
import { deleteCakeSampleFile, resolveCakeSampleDisplayUrl } from "@/lib/cake-sample";

// API-supported status values (confirmed = accept, rejected = reject)
const STATUS_OPTIONS = [
  { value: "pending_confirmation", label: "Pending" },
  { value: "confirmed", label: "Confirmed (accept)" },
  { value: "rejected", label: "Rejected" },
  { value: "preparing", label: "Preparing" },
  { value: "ready_for_pickup", label: "Ready for pickup" },
  { value: "out_for_delivery", label: "Out for delivery" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

// Terminal / finished orders (dashboard "Finished" tab)
const FINISHED_STATUSES = new Set(["delivered", "cancelled", "rejected"]);

const ORDER_VIEW = {
  ACTIVE: "active",
  FINISHED: "finished",
  ALL: "all",
};

function CakeSamplePreview({ url }) {
  const [visible, setVisible] = useState(true);
  if (!url || !visible) return null;
  return (
    <div className="rounded-md border border-owner-action/30 bg-owner-action/5 p-2">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-owner-muted">
        Sample cake image
      </p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex items-start gap-3 text-xs font-medium text-owner-action hover:underline"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt="Customer cake sample"
          className="h-20 w-20 shrink-0 rounded-md object-cover ring-1 ring-owner-border"
          onError={() => setVisible(false)}
        />
        <span className="pt-1">Open sample</span>
      </a>
    </div>
  );
}

function orderStatusValue(o) {
  return String(o.status ?? o.order_status ?? "").toLowerCase();
}

function getOptionsForOrder(order) {
  const current = order?.status;
  if (!current || STATUS_OPTIONS.some((o) => o.value === current)) {
    return STATUS_OPTIONS;
  }
  return [
    { value: current, label: current.replace(/_/g, " ") },
    ...STATUS_OPTIONS,
  ];
}

/** Solid banner behind total + status (white text); select uses light surface for contrast */
function getStatusBannerClasses(status) {
  const s = (status || "").toLowerCase();
  switch (s) {
    case "pending_confirmation":
      return "bg-amber-500 text-white shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]";
    case "confirmed":
      return "bg-blue-600 text-white shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]";
    case "rejected":
      return "bg-red-800 text-white shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]";
    case "preparing":
      return "bg-orange-500 text-white shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]";
    case "ready_for_pickup":
      return "bg-teal-600 text-white shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]";
    case "out_for_delivery":
      return "bg-violet-600 text-white shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]";
    case "delivered":
      return "bg-emerald-600 text-white shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]";
    case "cancelled":
      return "bg-red-600 text-white shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]";
    default:
      return "bg-slate-600 text-white shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.08)]";
  }
}

function getStatusDisplayLabel(status) {
  const raw = status || "";
  const fromList = STATUS_OPTIONS.find((o) => o.value === raw)?.label;
  if (fromList) return fromList;
  return raw ? raw.replace(/_/g, " ") : "Unknown";
}

function formatOrderDateTime(order) {
  const raw = order.placed_at ?? order.created_at ?? order.updated_at;
  if (!raw) return "—";
  return new Date(raw).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function OrdersTab({ restaurantId, orders: ordersProp, onRefresh, isBakery = false }) {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toastMessage, setToastMessage] = useState(null);
  const [orderView, setOrderView] = useState(ORDER_VIEW.ACTIVE);
  const [estimateDialog, setEstimateDialog] = useState(null);

  const loadOrders = useCallback((silent = false, cacheBust = false) => {
    if (!token || !restaurantId) return;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    // Always load full list so "Active" vs "All" and switching filters stay correct
    getRestaurantOrders(token, restaurantId, undefined, cacheBust)
      .then((res) => {
        const arr = toArray(res);
        setOrders(arr.map((o) => ({ ...o, status: o.status ?? o.order_status ?? "" })));
      })
      .catch((err) => {
        if (!silent) {
          setError(err?.data?.message || err?.message || "Failed to load orders");
          setOrders([]);
        }
      })
      .finally(() => { if (!silent) setLoading(false); });
  }, [token, restaurantId]);

  // Use parent's orders when provided (enables real-time refresh from OwnerRefreshContext)
  const rawOrders = ordersProp != null && Array.isArray(ordersProp)
    ? ordersProp.map((o) => ({ ...o, status: o.status ?? o.order_status ?? "" }))
    : orders;

  const activeCount = rawOrders.filter((o) => !FINISHED_STATUSES.has(orderStatusValue(o))).length;
  const finishedCount = rawOrders.filter((o) => FINISHED_STATUSES.has(orderStatusValue(o))).length;

  const displayOrdersBase =
    orderView === ORDER_VIEW.ACTIVE
      ? rawOrders.filter((o) => !FINISHED_STATUSES.has(orderStatusValue(o)))
      : orderView === ORDER_VIEW.FINISHED
        ? rawOrders.filter((o) => FINISHED_STATUSES.has(orderStatusValue(o)))
        : rawOrders;

  const displayOrders = isBakery
    ? [...displayOrdersBase].sort((a, b) => {
        const sa = a.scheduled_for ?? a.scheduledFor ?? "";
        const sb = b.scheduled_for ?? b.scheduledFor ?? "";
        if (sa && sb) return String(sa).localeCompare(String(sb));
        if (sa) return -1;
        if (sb) return 1;
        return 0;
      })
    : displayOrdersBase;

  useEffect(() => {
    if (ordersProp != null && Array.isArray(ordersProp)) {
      setLoading(false);
      return;
    }
    loadOrders(false);
  }, [loadOrders, ordersProp]);

  async function handleStatusChange(orderId, newStatus, estimatedMinutes) {
    if (!token || !restaurantId) return;
    let cancellationReason;
    if (newStatus === "cancelled") {
      const entered = typeof window !== "undefined" ? window.prompt("Cancellation reason (required):") : null;
      if (entered == null) return;
      cancellationReason = String(entered).trim();
      if (!cancellationReason) {
        setToastMessage("Cancellation reason is required.");
        return;
      }
    }

    const orderBefore = (ordersProp != null && Array.isArray(ordersProp) ? ordersProp : orders).find(
      (o) => o.id === orderId
    );
    const notesBefore = orderBefore?.delivery_instructions ?? orderBefore?.notes ?? "";

    let fifthParam;
    if (newStatus === "cancelled") {
      fifthParam = cancellationReason;
    } else if (
      (newStatus === "confirmed" || newStatus === "preparing") &&
      estimatedMinutes != null
    ) {
      fifthParam = { estimated_ready_minutes: estimatedMinutes };
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
    try {
      await updateOrderStatus(token, restaurantId, orderId, newStatus, fifthParam);
      if (FINISHED_STATUSES.has(newStatus)) {
        void deleteCakeSampleFile(token, notesBefore);
      }
      if (onRefresh) onRefresh();
      else loadOrders(true, true);
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to update status";
      setToastMessage(msg);
      if (onRefresh) onRefresh();
      else loadOrders(true, true);
    }
  }

  if (loading) return <p className="py-8 text-owner-muted">Loading orders...</p>;
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <p className="text-red-600">{error}</p>
        <button
          type="button"
          onClick={() => loadOrders(false)}
          className="touch-manipulation mt-2 min-h-[48px] rounded-xl bg-red-100 px-4 py-3 text-sm font-medium text-red-700"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative max-w-full min-w-0">
      <Toast
        message={toastMessage}
        type="error"
        onClose={() => setToastMessage(null)}
      />
      {/* Active | Finished | All — one row (owner dashboard) */}
      <div
        className="flex gap-2 rounded-lg border border-owner-border bg-owner-paper p-1.5"
        role="tablist"
        aria-label="Orders"
      >
        <button
          type="button"
          role="tab"
          aria-selected={orderView === ORDER_VIEW.ACTIVE}
          onClick={() => setOrderView(ORDER_VIEW.ACTIVE)}
          className={`touch-manipulation min-h-[40px] flex-1 rounded-md px-2 py-2 text-sm font-semibold transition-colors active:scale-[0.98] sm:px-3 ${
            orderView === ORDER_VIEW.ACTIVE
              ? "bg-owner-action text-white shadow"
              : "text-owner-charcoal hover:bg-owner-card"
          }`}
        >
          Active
          {activeCount > 0 && (
            <span
              className={`ml-1 inline-flex min-w-[1.25rem] justify-center rounded-full px-1 py-0.5 text-[11px] tabular-nums sm:ml-1.5 ${
                orderView === ORDER_VIEW.ACTIVE ? "bg-white/20 text-white" : "bg-owner-border text-owner-charcoal"
              }`}
            >
              {activeCount}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={orderView === ORDER_VIEW.FINISHED}
          onClick={() => setOrderView(ORDER_VIEW.FINISHED)}
          className={`touch-manipulation min-h-[40px] flex-1 rounded-md px-2 py-2 text-sm font-semibold transition-colors active:scale-[0.98] sm:px-3 ${
            orderView === ORDER_VIEW.FINISHED
              ? "bg-owner-action text-white shadow"
              : "text-owner-charcoal hover:bg-owner-card"
          }`}
        >
          Finished
          {finishedCount > 0 && (
            <span
              className={`ml-1 inline-flex min-w-[1.25rem] justify-center rounded-full px-1 py-0.5 text-[11px] tabular-nums sm:ml-1.5 ${
                orderView === ORDER_VIEW.FINISHED ? "bg-white/20 text-white" : "bg-owner-border text-owner-charcoal"
              }`}
            >
              {finishedCount}
            </span>
          )}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={orderView === ORDER_VIEW.ALL}
          onClick={() => setOrderView(ORDER_VIEW.ALL)}
          className={`touch-manipulation min-h-[40px] flex-1 rounded-md px-2 py-2 text-sm font-semibold transition-colors active:scale-[0.98] sm:px-3 ${
            orderView === ORDER_VIEW.ALL
              ? "bg-owner-action text-white shadow"
              : "text-owner-charcoal hover:bg-owner-card"
          }`}
        >
          All
          {rawOrders.length > 0 && (
            <span
              className={`ml-1 inline-flex min-w-[1.25rem] justify-center rounded-full px-1 py-0.5 text-[11px] tabular-nums sm:ml-1.5 ${
                orderView === ORDER_VIEW.ALL ? "bg-white/20 text-white" : "bg-owner-border text-owner-charcoal"
              }`}
            >
              {rawOrders.length}
            </span>
          )}
        </button>
      </div>
      {displayOrders.length === 0 ? (
        <p className="py-8 text-owner-muted">
          {orderView === ORDER_VIEW.ACTIVE && "No active orders. Open Finished or All to see completed orders."}
          {orderView === ORDER_VIEW.FINISHED && "No finished orders (delivered, cancelled, or rejected)."}
          {orderView === ORDER_VIEW.ALL && "No orders found."}
        </p>
      ) : (
        <ul className="list-none p-0 m-0 columns-1 gap-x-4 md:columns-2 lg:columns-3 [column-fill:balance]">
          {displayOrders.map((order) => {
            const customerName = order.customer_name ?? order.user?.name ?? "Guest";
            const customerEmail = order.customer_email ?? order.user?.email ?? "";
            const customerPhone = order.customer_phone ?? order.user?.phone ?? "";
            const orderType = (order.order_type || "").toLowerCase();
            const isDelivery = orderType === "delivery";
            const itemsList = getOrderLineItems(order);
            const notes = order.delivery_instructions ?? order.notes ?? "";
            const typeLabel =
              orderType === "delivery"
                ? "Delivery"
                : orderType === "pickup"
                  ? isBakery
                    ? "Pickup"
                    : "Takeaway"
                  : orderType || "—";
            const isCustomCake = isBakery && String(notes).includes("[Custom cake order]");
            const sampleImageUrl = isCustomCake
              ? resolveCakeSampleDisplayUrl(parseCustomCakeSampleUrl(notes))
              : "";
            const notesForDisplay = sampleImageUrl ? stripCustomCakeSampleLine(notes) : notes;
            const cakeMeta = isCustomCake ? parseCustomCakeFlavorSize(notes) : { flavor: "", size: "" };
            const statusValue = order.status ?? order.order_status ?? "";
            const bannerClass = getStatusBannerClasses(statusValue);
            const scheduledRaw = order.scheduled_for ?? order.scheduledFor;
            let scheduledLabel = null;
            if (scheduledRaw) {
              const d = new Date(scheduledRaw);
              if (!Number.isNaN(d.getTime())) {
                scheduledLabel = d.toLocaleString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                });
              }
            }

            return (
              <li
                key={order.id}
                className="mb-4 w-full break-inside-avoid overflow-hidden rounded-xl border border-owner-border bg-owner-card shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Status-colored top: total + status (no table layout) */}
                <div className={`relative px-4 py-3 sm:px-5 sm:py-4 ${bannerClass}`}>
                  <button
                    type="button"
                    onClick={() =>
                      void printOrderKitchenReceipt({
                        ...order,
                        restaurant_id: order.restaurant_id ?? restaurantId,
                      })
                    }
                    className="absolute right-3 top-3 z-10 flex h-9 w-9 touch-manipulation items-center justify-center rounded-lg border border-white/35 bg-white/15 text-white shadow-md hover:bg-white/25"
                    title="Reprint kitchen ticket (print agent)"
                    aria-label="Reprint kitchen ticket"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                      />
                    </svg>
                  </button>
                  <div className="flex flex-col gap-3 pr-10">
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/85">
                        Order #{order.id}
                      </p>
                      <p className="mt-0.5 text-2xl font-bold tabular-nums tracking-tight sm:text-3xl">
                        {formatPrice(order.total_amount ?? order.total)}
                      </p>
                      <p className="mt-1 text-xs font-medium text-white/80">{getStatusDisplayLabel(statusValue)}</p>
                    </div>
                    <div className="min-w-0 w-full">
                      <label className="sr-only" htmlFor={`order-status-${order.id}`}>
                        Update status
                      </label>
                      <select
                        id={`order-status-${order.id}`}
                        value={statusValue}
                        onChange={(e) => {
                          const v = e.target.value;
                          // Cake orders already have a scheduled pickup time — no ASAP estimate dialog.
                          if (!isBakery && (v === "confirmed" || v === "preparing")) {
                            setEstimateDialog({ orderId: order.id, newStatus: v });
                            return;
                          }
                          handleStatusChange(order.id, v);
                        }}
                        className="touch-manipulation h-11 w-full rounded-lg border-0 bg-white/95 px-3 text-sm font-semibold text-slate-900 shadow-md outline-none ring-2 ring-white/30 focus:ring-4 focus:ring-white/50"
                      >
                        {getOptionsForOrder(order).map((s) => (
                          <option key={s.value} value={s.value}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 p-4 sm:p-5">
                  <p className="text-xs text-owner-muted">
                    <span className="font-medium text-owner-charcoal">Placed</span>{" "}
                    {formatOrderDateTime(order)}
                  </p>
                  {(order.estimated_ready_minutes != null || order.estimated_ready_at) && (
                    <p className="mt-1 text-xs font-medium text-emerald-800 dark:text-emerald-200">
                      Est. ready
                      {order.estimated_ready_minutes != null ? ` ~${order.estimated_ready_minutes} min` : ""}
                      {order.estimated_ready_at
                        ? ` · ${new Date(order.estimated_ready_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}`
                        : ""}
                    </p>
                  )}

                  <div className="rounded-lg border border-owner-border/70 bg-owner-paper/40 p-3 sm:p-4 space-y-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-owner-muted">
                        Customer / contact
                      </p>
                      <p className="mt-1.5 text-sm font-semibold text-owner-charcoal leading-snug tracking-tight">
                        {customerName}
                      </p>
                      <div className="mt-2 flex flex-col gap-1.5">
                        {customerPhone ? (
                          <a
                            href={`tel:${customerPhone.replace(/\s/g, "")}`}
                            className="inline-flex items-center gap-1.5 text-xs text-owner-charcoal hover:text-owner-action"
                          >
                            <svg className="h-3.5 w-3.5 shrink-0 text-owner-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="truncate font-medium">{customerPhone}</span>
                          </a>
                        ) : null}
                        {customerEmail ? (
                          <a
                            href={`mailto:${customerEmail}`}
                            className="inline-flex items-start gap-1.5 text-xs text-owner-charcoal hover:text-owner-action break-all"
                          >
                            <svg className="h-3.5 w-3.5 shrink-0 text-owner-muted mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="min-w-0 font-medium leading-snug">{customerEmail}</span>
                          </a>
                        ) : null}
                        {!customerPhone && !customerEmail ? (
                          <span className="text-xs text-owner-muted">No phone or email</span>
                        ) : null}
                      </div>
                    </div>

                    <div className="border-t border-owner-border/60 pt-3 space-y-1.5 text-xs leading-relaxed">
                      <p className="text-owner-charcoal">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-owner-muted">Type</span>
                        <span className="mx-1.5 text-owner-border">·</span>
                        <span className="font-medium">{typeLabel}</span>
                        {!isBakery && scheduledLabel ? (
                          <span className="ml-2 text-owner-action">· Scheduled {scheduledLabel}</span>
                        ) : null}
                        {!isBakery && !scheduledLabel ? (
                          <span className="ml-2 text-owner-muted">· ASAP</span>
                        ) : null}
                      </p>
                      {isDelivery && (order.delivery_address || order.delivery_address_line_1) ? (
                        <p className="text-owner-muted">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-owner-muted">Address</span>
                          <span className="mx-1.5 text-owner-border">·</span>
                          <span>{order.delivery_address || order.delivery_address_line_1}</span>
                        </p>
                      ) : null}
                      {isBakery && scheduledLabel ? (
                        <p className="rounded-md bg-owner-action/10 px-2 py-1.5 text-xs font-semibold text-owner-action">
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-owner-muted">Pickup</span>
                          <span className="mx-1.5 text-owner-border">·</span>
                          {scheduledLabel}
                        </p>
                      ) : null}
                      {notesForDisplay ? (
                        <p
                          className={`${isCustomCake || isBakery ? "whitespace-pre-wrap rounded-md border border-owner-action/30 bg-owner-action/5 p-2 text-owner-charcoal" : "text-owner-muted line-clamp-4"}`}
                          title={notesForDisplay}
                        >
                          <span className="text-[10px] font-semibold uppercase tracking-wider text-owner-muted">
                            {isCustomCake ? "Cake details" : "Notes"}
                          </span>
                          <span className="mx-1.5 text-owner-border">·</span>
                          {notesForDisplay}
                        </p>
                      ) : null}
                      {sampleImageUrl ? (
                        <CakeSamplePreview url={sampleImageUrl} />
                      ) : null}
                    </div>

                    <div className="border-t border-owner-border/60 pt-3 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wider text-owner-muted">Items</p>
                      {itemsList.length > 0 ? (
                        <ul className="mt-2 space-y-2 text-xs">
                          {itemsList.map((line, idx) => {
                            const rowTotal = getLineItemRowTotal(line);
                            const qty = Number(line.quantity) || 1;
                            return (
                              <li
                                key={line.id ?? line.order_item_id ?? idx}
                                className="flex flex-col gap-0.5 border-b border-owner-border/35 pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
                              >
                                <span className="min-w-0 block text-owner-charcoal leading-snug">
                                  <span className="font-medium">{getLineItemDisplayName(line)}</span>
                                  <span className="text-owner-muted">{" · "}× {qty}</span>
                                </span>
                                <span className="shrink-0 tabular-nums text-[11px] text-owner-muted sm:pt-0.5">
                                  {formatPrice(rowTotal)}
                                </span>
                              </li>
                            );
                          })}
                        </ul>
                      ) : isCustomCake && (cakeMeta.flavor || cakeMeta.size) ? (
                        <ul className="mt-2 space-y-2 text-xs">
                          <li className="flex flex-col gap-0.5 border-b border-owner-border/35 pb-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                            <span className="min-w-0 block text-owner-charcoal leading-snug">
                              <span className="font-medium">
                                {[cakeMeta.flavor, cakeMeta.size].filter(Boolean).join(" · ")}
                              </span>
                              <span className="text-owner-muted">{" · "}× 1</span>
                            </span>
                            <span className="shrink-0 tabular-nums text-[11px] text-owner-muted sm:pt-0.5">
                              {formatPrice(order.total_amount ?? order.total)}
                            </span>
                          </li>
                        </ul>
                      ) : (
                        <p className="mt-1.5 text-xs text-owner-muted">No line items</p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {estimateDialog && !isBakery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="owner-animate-modal-backdrop absolute inset-0 bg-black/50" aria-hidden />
          <div className="owner-animate-modal-center relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-owner-border bg-owner-card p-4 shadow-xl">
            <h3 className="text-base font-bold text-owner-charcoal">Update order status</h3>
            <p className="mt-1 text-sm text-owner-muted">
              Setting to <strong className="text-owner-charcoal">{estimateDialog.newStatus.replace(/_/g, " ")}</strong>
              . Optionally tell the customer how long to wait.
            </p>
            <EstimatedReadyMinutesForm
              className="mt-4"
              onCancel={() => setEstimateDialog(null)}
              onConfirm={(min) => {
                const { orderId, newStatus } = estimateDialog;
                setEstimateDialog(null);
                handleStatusChange(orderId, newStatus, min);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
