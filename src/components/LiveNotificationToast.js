"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { EVENTS } from "@/context/RealTimeNotificationContext";
import { useAuth } from "@/context/AuthContext";
import { updateOrderStatus, updateReservationStatus } from "@/lib/api";
import { NotificationStack } from "@/components/NotificationStack";
import { getOrderLineItems, getLineItemDisplayName } from "@/lib/owner-utils";
import { formatCurrencyEUROrDash } from "@/lib/format-currency";
import { EstimatedReadyMinutesForm } from "@/components/owner/EstimatedReadyMinutesForm";
import { tryShowOwnerDeviceNotification } from "@/lib/owner-device-notifications";
import { printOrderKitchenReceipt } from "@/lib/order-receipt-print";

/** Extract restaurant ID from /owner/dashboard/[id] path when on owner dashboard */
function getRestaurantIdFromPath() {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/\/owner\/dashboard\/(\d+)/);
  return m ? m[1] : null;
}

function ownerDashboardPath(detail) {
  const rid = detail?.restaurant_id ?? detail?.restaurant?.id ?? getRestaurantIdFromPath();
  return rid != null && rid !== "" ? `/owner/dashboard/${rid}` : "/owner";
}

/** API may send handled_by as a string or as a nested user object */
function formatHandledByLabel(handledBy) {
  if (handledBy == null || handledBy === "") return "";
  if (typeof handledBy === "string" || typeof handledBy === "number") {
    return String(handledBy).trim();
  }
  if (typeof handledBy !== "object") return "";
  const o = handledBy;
  const candidates = [
    o.name,
    o.full_name,
    o.display_name,
    o.email,
    o.username,
    o.user_name,
    typeof o.first_name === "string" || typeof o.last_name === "string"
      ? [o.first_name, o.last_name].filter(Boolean).join(" ").trim()
      : null,
    o.user?.name,
    o.user?.email,
    o.staff_name,
  ];
  for (const c of candidates) {
    if (c != null && String(c).trim() !== "") return String(c).trim();
  }
  if (o.id != null && o.id !== "") return `User #${o.id}`;
  return "";
}

function formatHandledAtLabel(value, formatReadableDateTime) {
  if (value == null || value === "") return "";
  if (typeof value === "object" && value !== null && !(value instanceof Date)) {
    const nested = value.datetime ?? value.at ?? value.date ?? value.created_at ?? value.updated_at;
    if (nested != null) return formatHandledAtLabel(nested, formatReadableDateTime);
    return "";
  }
  const pretty = formatReadableDateTime(value);
  if (pretty) return pretty;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleString();
}

function resolvedElsewhereMessage(detail, formatReadableDateTime) {
  const who = formatHandledByLabel(detail?.handled_by);
  const when = formatHandledAtLabel(detail?.handled_at, formatReadableDateTime);
  if (who) {
    return when ? `Handled by ${who} at ${when}.` : `Handled by ${who}.`;
  }
  if (detail?.handled_by != null) {
    return when ? `Handled by another staff member at ${when}.` : "Handled by another staff member.";
  }
  return "Already handled from another tab/device.";
}

/** Same nav height as MenuTab (4rem + safe area) + ~1.5rem gap so toasts clear the tab bar */
const OWNER_NOTIF_STACK_CLASS =
  "!max-sm:bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] max-sm:!pb-0";

/**
 * Centralized live notification stack: food orders and table reservations.
 * All events appear in one stack, bottom-right (desktop) / bottom with margin (mobile).
 * Newest on top, stacked like social site popups.
 */
export function LiveNotificationToast() {
  const pathname = usePathname();
  const [toasts, setToasts] = useState([]);
  const ringIntervalRef = useRef(null);
  const deviceNotifDedupeRef = useRef({ tag: "", at: 0 });
  const ownerStackClass = pathname?.startsWith("/owner") ? OWNER_NOTIF_STACK_CLASS : "";

  const fireDeviceNotification = useCallback((payload) => {
    if (typeof window === "undefined") return;
    const now = Date.now();
    const { tag } = payload;
    if (deviceNotifDedupeRef.current.tag === tag && now - deviceNotifDedupeRef.current.at < 500) return;
    deviceNotifDedupeRef.current = { tag, at: now };
    void tryShowOwnerDeviceNotification(payload);
  }, []);

  const playNotificationSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      const master = ctx.createGain();
      master.gain.setValueAtTime(0.92, ctx.currentTime);
      master.connect(ctx.destination);

      // Ascending major arpeggio + octave partial (bell-like, not a flat beep)
      const notes = [
        { f: 587.33, at: 0.0, peak: 0.12 }, // D5
        { f: 739.99, at: 0.09, peak: 0.14 }, // F#5
        { f: 880.0, at: 0.18, peak: 0.16 }, // A5
        { f: 1174.66, at: 0.3, peak: 0.2 }, // D6
      ];
      const sustain = 0.38;

      notes.forEach(({ f, at, peak }) => {
        const t0 = ctx.currentTime + at;

        const body = ctx.createOscillator();
        body.type = "sine";
        body.frequency.setValueAtTime(f, t0);

        const bright = ctx.createOscillator();
        bright.type = "sine";
        bright.frequency.setValueAtTime(f * 2, t0);

        const env = ctx.createGain();
        env.gain.setValueAtTime(0.0001, t0);
        env.gain.linearRampToValueAtTime(peak, t0 + 0.022);
        env.gain.exponentialRampToValueAtTime(0.0001, t0 + sustain);

        const bLevel = ctx.createGain();
        bLevel.gain.value = 0.62;
        const brLevel = ctx.createGain();
        brLevel.gain.value = 0.38;

        body.connect(bLevel);
        bright.connect(brLevel);
        bLevel.connect(env);
        brLevel.connect(env);
        env.connect(master);

        body.start(t0);
        bright.start(t0);
        body.stop(t0 + sustain + 0.06);
        bright.stop(t0 + sustain + 0.06);
      });

      const doneMs = Math.ceil((0.32 + sustain + 0.18) * 1000);
      setTimeout(() => ctx.close().catch(() => {}), doneMs);
    } catch (_) {
      // Ignore autoplay/sound API errors to avoid breaking notifications.
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const markToastResolved = useCallback((id) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, resolved: true } : t)));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hasPending = toasts.some((t) => (t.type === "reservation" || t.type === "order") && !t.resolved);
    if (hasPending && ringIntervalRef.current == null) {
      // Ring continuously until owner resolves all actionable notifications.
      ringIntervalRef.current = window.setInterval(() => {
        playNotificationSound();
      }, 2000);
      return;
    }
    if (!hasPending && ringIntervalRef.current != null) {
      window.clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
  }, [toasts, playNotificationSound]);

  useEffect(() => {
    return () => {
      if (ringIntervalRef.current != null) {
        window.clearInterval(ringIntervalRef.current);
        ringIntervalRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const getReservationKey = (d) => {
      const id = d?.id ?? d?.booking_id ?? d?.reservation_id ?? d?.data?.id ?? d?.data?.booking_id ?? d?.data?.reservation_id ?? d?.reservation?.id;
      if (id != null && id !== "") return `reservation-${id}`;
      return `reservation-${d?.restaurant_id ?? ""}-${d?.reservation_date ?? ""}-${d?.reservation_time ?? ""}-${d?.customer_name ?? ""}`;
    };
    const getOrderKey = (d) => {
      const id = d?.id ?? d?.order_id ?? d?.table_order_id ?? d?.data?.id ?? d?.data?.order_id ?? d?.order?.id;
      if (id != null && id !== "") return `order-${id}`;
      return `order-${d?.restaurant_id ?? ""}-${Date.now()}`;
    };

    const handleReservation = (e) => {
      const detail = e.detail ?? {};
      const key = getReservationKey(detail);
      setToasts((prev) => {
        if (prev.some((t) => t.type === "reservation" && t.dedupeKey === key)) return prev;
        playNotificationSound();
        const id = `res-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const restaurantName = detail.restaurant?.name ?? "Restaurant";
        const customerName = detail.customer_name ?? detail.user?.name ?? "A customer";
        const message = `${customerName} made a reservation at ${restaurantName}`;
        fireDeviceNotification({
          title: "New reservation",
          body: message,
          tag: key,
          url: ownerDashboardPath(detail),
        });
        return [
          ...prev,
          { id, dedupeKey: key, type: "reservation", title: "New Reservation", message, detail, resolved: false },
        ];
      });
    };

    const handleOrder = (e) => {
      const detail = e.detail ?? {};
      const key = getOrderKey(detail);
      setToasts((prev) => {
        if (prev.some((t) => t.type === "order" && t.dedupeKey === key)) return prev;
        playNotificationSound();
        const id = `ord-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        const restaurantName = detail.restaurant_name ?? detail.restaurant?.name ?? "Restaurant";
        const message = `New order received for ${restaurantName}`;
        fireDeviceNotification({
          title: "New order",
          body: message,
          tag: key,
          url: ownerDashboardPath(detail),
        });
        return [
          ...prev,
          { id, dedupeKey: key, type: "order", title: "New Order", message, detail, resolved: false },
        ];
      });
    };

    const handleReservationUpdated = (e) => {
      const detail = e.detail ?? {};
      const key = getReservationKey(detail);
      setToasts((prev) =>
        prev.map((t) =>
          t.type === "reservation" && t.dedupeKey === key
            ? { ...t, resolved: true, detail: { ...t.detail, ...detail } }
            : t
        )
      );
      const restaurantName = detail.restaurant?.name ?? "Restaurant";
      const status = detail.status ?? "updated";
      const id = `res-upd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [
        ...prev,
        {
          id,
          type: "reservation-updated",
          title: "Reservation updated",
          message: `Reservation at ${restaurantName} is now ${status}`,
          detail,
        },
      ]);
      setTimeout(() => removeToast(id), 2000);
    };

    const handleOrderUpdated = (e) => {
      const detail = e.detail ?? {};
      const key = getOrderKey(detail);
      setToasts((prev) =>
        prev.map((t) =>
          t.type === "order" && t.dedupeKey === key
            ? { ...t, resolved: true, detail: { ...t.detail, ...detail } }
            : t
        )
      );
      const restaurantName = detail.restaurant?.name ?? detail.restaurant_name ?? "Restaurant";
      const status = detail.status ?? "updated";
      const id = `ord-upd-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [
        ...prev,
        {
          id,
          type: "reservation-updated",
          title: "Order updated",
          message: `Order at ${restaurantName} is now ${status}`,
          detail,
        },
      ]);
      setTimeout(() => removeToast(id), 2000);
    };

    window.addEventListener(EVENTS.NEW_RESERVATION, handleReservation);
    window.addEventListener(EVENTS.NEW_ORDER, handleOrder);
    window.addEventListener(EVENTS.RESERVATION_UPDATED, handleReservationUpdated);
    window.addEventListener(EVENTS.ORDER_UPDATED, handleOrderUpdated);

    return () => {
      window.removeEventListener(EVENTS.NEW_RESERVATION, handleReservation);
      window.removeEventListener(EVENTS.NEW_ORDER, handleOrder);
      window.removeEventListener(EVENTS.RESERVATION_UPDATED, handleReservationUpdated);
      window.removeEventListener(EVENTS.ORDER_UPDATED, handleOrderUpdated);
    };
  }, [playNotificationSound, removeToast, fireDeviceNotification]);

  if (toasts.length === 0) return null;

  // Newest first (top of stack)
  const ordered = [...toasts].reverse();

  return (
    <NotificationStack className={ownerStackClass}>
      {ordered.map((t) =>
        t.type === "reservation-updated" ? (
          <LiveToastItem
            key={t.id}
            {...t}
            onDismiss={() => removeToast(t.id)}
          />
        ) : (
          <LiveCardItem
            key={t.id}
            {...t}
            onResolved={() => markToastResolved(t.id)}
            onDismiss={() => removeToast(t.id)}
          />
        )
      )}
    </NotificationStack>
  );
}

function LiveCardItem({ id, type, title, message, detail, resolved, onResolved, onDismiss }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [orderAcceptPicking, setOrderAcceptPicking] = useState(false);

  const isReservation = type === "reservation";
  const isActionable = !success && !resolved;

  const formatReadableDateTime = (value) => {
    if (!value) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getReservationDateTimeText = (reservation) => {
    const datePart = (reservation?.reservation_date ?? reservation?.date ?? "").toString().trim();
    const timePart = (reservation?.reservation_time ?? reservation?.time ?? "").toString().trim().replace(/\.\d+Z?$/i, "").slice(0, 5);
    if (datePart) {
      const normalizedDate = datePart.replace(/^(\d{4})-(\d{2})-(\d{2}).*/, "$1-$2-$3");
      const source = timePart ? `${normalizedDate}T${timePart}` : normalizedDate;
      const pretty = formatReadableDateTime(source);
      if (pretty) return pretty;
    }
    return (
      formatReadableDateTime(
        reservation?.reservation_datetime ??
        reservation?.datetime ??
        reservation?.created_at
      ) || [datePart, timePart].filter(Boolean).join(" at ") || "—"
    );
  };

  const getOrderDateTimeText = (order) => {
    return (
      formatReadableDateTime(
        order?.placed_at ??
        order?.created_at ??
        order?.updated_at
      ) || "—"
    );
  };

  const handleAction = async (status, cancellationReason, estimatedReadyMinutes) => {
    setLoading(true);
    setError(null);
    try {
      const inner = detail?.order ?? detail?.reservation ?? detail?.table_order ?? detail?.data ?? detail;
      const entity = inner?.order ?? inner?.reservation ?? inner?.table_order ?? inner;
      let restaurantId = entity?.restaurant_id ?? inner?.restaurant_id ?? detail?.restaurant_id ?? entity?.restaurant?.id ?? inner?.restaurant?.id ?? detail?.restaurant?.id ?? detail?.data?.restaurant_id;
      let itemId = entity?.id ?? inner?.id ?? detail?.id ?? entity?.order_id ?? inner?.order_id ?? detail?.order_id ?? entity?.reservation_id ?? inner?.reservation_id ?? detail?.reservation_id ?? entity?.table_order_id ?? inner?.table_order_id ?? detail?.table_order_id ?? entity?.booking_id ?? inner?.booking_id ?? detail?.booking_id ?? detail?.data?.id ?? detail?.data?.order_id ?? detail?.data?.reservation_id;

      if (!restaurantId) {
        restaurantId = getRestaurantIdFromPath() ?? process.env.NEXT_PUBLIC_RESTAURANT_ID;
      }

      if (!restaurantId || itemId == null || itemId === "") {
        const missing = [];
        if (!restaurantId) missing.push("restaurant_id");
        if (itemId == null || itemId === "") missing.push("order/reservation id");
        throw new Error(`Missing ${missing.join(" and ")} to perform action. Received: ${JSON.stringify({ restaurantId, itemId, hasDetail: !!detail })}`);
      }

      restaurantId = String(restaurantId);
      itemId = String(itemId);

      if (type === "reservation") {
        await updateReservationStatus(token, restaurantId, itemId, status, cancellationReason);
      } else if (type === "order") {
        if (status === "confirmed") {
          const extra =
            estimatedReadyMinutes != null ? { estimated_ready_minutes: estimatedReadyMinutes } : {};
          await updateOrderStatus(token, restaurantId, itemId, "confirmed", extra);
        } else {
          await updateOrderStatus(token, restaurantId, itemId, "rejected");
        }
      }

      setSuccess(true);
      setOrderAcceptPicking(false);
      onResolved?.();
      if (type === "order") {
        window.dispatchEvent(new CustomEvent(EVENTS.ORDER_UPDATED, { detail }));
      } else {
        window.dispatchEvent(new CustomEvent(EVENTS.RESERVATION_UPDATED, { detail }));
      }
      setTimeout(onDismiss, 2000);
    } catch (err) {
      setError(err?.message || "Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  const openRejectDialog = () => {
    setError(null);
    setRejectReason("");
    setShowRejectDialog(true);
  };

  const closeRejectDialog = () => {
    if (loading) return;
    setShowRejectDialog(false);
    setRejectReason("");
  };

  const submitRejectWithReason = async () => {
    const reason = rejectReason.trim();
    if (!reason) {
      setError("Please provide a cancellation reason.");
      return;
    }
    await handleAction("cancelled", reason);
    setShowRejectDialog(false);
  };

  return (
    <div
      role="alert"
      className="relative w-full overflow-hidden rounded-2xl border border-owner-border bg-owner-card p-4 pr-12 text-left text-owner-charcoal shadow-xl ring-1 ring-black/5"
    >
      {type === "order" && detail && (
        <button
          type="button"
          onClick={() => printOrderKitchenReceipt(detail)}
          className="absolute right-2 top-2 z-10 flex h-9 w-9 touch-manipulation items-center justify-center rounded-lg border border-owner-border bg-owner-paper text-owner-charcoal shadow-sm hover:bg-white hover:ring-1 hover:ring-owner-border"
          title="Print receipt (80 mm thermal, e.g. Epson TM-m30 — choose printer in print dialog)"
          aria-label="Print order receipt"
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
      )}
      <div className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
            isReservation ? "bg-emerald-100" : "bg-amber-100"
          }`}
        >
          {isReservation ? (
            <svg className="h-5 w-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-amber-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-owner-charcoal">{title}</h3>
          <p className="truncate text-sm text-owner-muted">{message}</p>
        </div>
      </div>

      {detail && (
        <div className="mt-3 max-h-32 overflow-y-auto rounded-xl border border-owner-border bg-owner-paper p-3 text-sm text-owner-charcoal">
          {type === "reservation" && (
            <ul className="space-y-1">
              <li><strong className="text-owner-charcoal">Date:</strong> {getReservationDateTimeText(detail)}</li>
              <li><strong className="text-owner-charcoal">Party:</strong> {detail.party_size != null ? `${detail.party_size} guest${Number(detail.party_size) === 1 ? "" : "s"}` : "—"}</li>
              <li><strong className="text-owner-charcoal">Customer:</strong> <span className="notranslate" translate="no">{detail.customer_name || detail.user?.name}</span></li>
              {detail.special_requests && <li className="truncate"><strong className="text-owner-charcoal">Notes:</strong> {detail.special_requests}</li>}
            </ul>
          )}
          {type === "order" && (
            <ul className="space-y-1">
              <li><strong className="text-owner-charcoal">Date:</strong> {getOrderDateTimeText(detail)}</li>
              <li><strong className="text-owner-charcoal">Total:</strong> {formatCurrencyEUROrDash(detail.total_amount)}</li>
              <li><strong className="text-owner-charcoal">Type:</strong> {detail.order_type ?? (detail.delivery_address?.toLowerCase?.().includes("pickup") ? "Pickup" : "Delivery") ?? "—"}</li>
              <li><strong className="text-owner-charcoal">Customer:</strong> <span className="notranslate" translate="no">{detail.customer_name || detail.user?.name || "—"}</span></li>
              {(() => {
                const lines = getOrderLineItems(detail);
                if (lines.length === 0) return null;
                return (
                  <li>
                    <strong className="text-owner-charcoal">Items:</strong>{" "}
                    <span className="notranslate" translate="no">
                      {lines.map((i) => getLineItemDisplayName(i)).filter(Boolean).join(", ")}
                    </span>
                  </li>
                );
              })()}
              {(detail.delivery_instructions || detail.notes) && <li className="truncate"><strong className="text-owner-charcoal">Notes:</strong> {detail.delivery_instructions || detail.notes}</li>}
            </ul>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm font-medium text-red-700">{error}</p>}
      {success && <p className="mt-2 text-sm font-medium text-emerald-700">Status updated!</p>}
      {resolved && !success && (
        <p className="mt-2 rounded-lg bg-amber-50 px-2 py-1.5 text-sm font-medium text-amber-900 ring-1 ring-amber-200/80">
          {resolvedElsewhereMessage(detail, formatReadableDateTime)}
        </p>
      )}

      {isActionable && (
        <div className="mt-4 space-y-3">
          {type === "order" && orderAcceptPicking ? (
            <EstimatedReadyMinutesForm
              disabled={loading}
              onCancel={() => setOrderAcceptPicking(false)}
              onConfirm={(min) => handleAction("confirmed", null, min)}
              className="rounded-xl border border-owner-border bg-owner-paper p-3"
            />
          ) : (
            <div className="flex gap-2">
              <button
                onClick={() => (type === "order" ? setOrderAcceptPicking(true) : handleAction("confirmed"))}
                disabled={loading}
                className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:opacity-50 transition-colors"
              >
                {loading ? "..." : "Accept"}
              </button>
              <button
                onClick={() => (isReservation ? openRejectDialog() : handleAction("rejected"))}
                disabled={loading}
                className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 transition-colors"
              >
                {loading ? "..." : "Reject"}
              </button>
            </div>
          )}
        </div>
      )}

      {showRejectDialog && (
        <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 ring-1 ring-red-200/60">
          <p className="text-sm font-semibold text-red-900">Cancellation reason</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Enter reason for cancellation..."
            className="mt-2 w-full rounded-lg border border-red-200/80 bg-white px-3 py-2 text-sm text-owner-charcoal outline-none ring-0 placeholder:text-owner-muted focus:border-red-400 focus:ring-2 focus:ring-red-300/50"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={closeRejectDialog}
              disabled={loading}
              className="flex-1 rounded-lg border border-owner-border bg-owner-paper px-3 py-2 text-sm font-medium text-owner-charcoal hover:bg-owner-card disabled:opacity-50"
            >
              Close
            </button>
            <button
              type="button"
              onClick={submitRejectWithReason}
              disabled={loading}
              className="flex-1 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? "Saving..." : "Confirm reject"}
            </button>
          </div>
        </div>
      )}

      {(!isActionable || success) && (
        <div className="mt-4">
          <button
            type="button"
            onClick={onDismiss}
            className="w-full rounded-xl border border-owner-border bg-owner-paper px-3 py-2 text-sm font-medium text-owner-charcoal hover:bg-owner-card transition-colors"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

function LiveToastItem({ id, type, title, message, onDismiss }) {
  return (
    <div
      role="alert"
      className="flex max-w-sm gap-3 rounded-xl border border-emerald-200 bg-white p-4 text-zinc-900 shadow-xl ring-1 ring-black/5"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100">
        <svg className="h-5 w-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-zinc-900">{title}</p>
        <p className="mt-0.5 text-sm text-zinc-600">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 text-xs font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950 hover:no-underline"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
