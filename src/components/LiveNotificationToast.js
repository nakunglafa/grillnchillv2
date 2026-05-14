"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { EVENTS } from "@/context/RealTimeNotificationContext";
import { useAuth } from "@/context/AuthContext";
import { updateOrderStatus, updateReservationStatus } from "@/lib/api";
import { NotificationStack } from "@/components/NotificationStack";
import { getOrderLineItems, getLineItemDisplayName } from "@/lib/owner-utils";
import { formatCurrencyEUROrDash } from "@/lib/format-currency";

/** Extract restaurant ID from /owner/dashboard/[id] path when on owner dashboard */
function getRestaurantIdFromPath() {
  if (typeof window === "undefined") return null;
  const m = window.location.pathname.match(/\/owner\/dashboard\/(\d+)/);
  return m ? m[1] : null;
}

/**
 * Centralized live notification stack: food orders and table reservations.
 * All events appear in one stack, bottom-right (desktop) / bottom with margin (mobile).
 * Newest on top, stacked like social site popups.
 */
export function LiveNotificationToast() {
  const [toasts, setToasts] = useState([]);
  const ringIntervalRef = useRef(null);

  const playNotificationSound = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      gain.connect(ctx.destination);

      // Two-tone ringtone pattern (different from previous short beep).
      const toneA = ctx.createOscillator();
      toneA.type = "triangle";
      toneA.frequency.setValueAtTime(720, ctx.currentTime);
      toneA.connect(gain);
      toneA.start(ctx.currentTime);
      toneA.stop(ctx.currentTime + 0.28);

      const toneB = ctx.createOscillator();
      toneB.type = "triangle";
      toneB.frequency.setValueAtTime(980, ctx.currentTime + 0.32);
      toneB.connect(gain);
      toneB.start(ctx.currentTime + 0.32);
      toneB.stop(ctx.currentTime + 0.68);

      gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.72);
      setTimeout(() => ctx.close().catch(() => {}), 900);
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
        return [
          ...prev,
          { id, dedupeKey: key, type: "reservation", title: "New Reservation", message: `${customerName} made a reservation at ${restaurantName}`, detail, resolved: false },
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
        return [
          ...prev,
          { id, dedupeKey: key, type: "order", title: "New Order", message: `New order received for ${restaurantName}`, detail, resolved: false },
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
      setTimeout(() => removeToast(id), 8000);
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
      setTimeout(() => removeToast(id), 8000);
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
  }, [playNotificationSound, removeToast]);

  if (toasts.length === 0) return null;

  // Newest first (top of stack)
  const ordered = [...toasts].reverse();

  return (
    <NotificationStack>
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

  const handleAction = async (status, cancellationReason) => {
    setLoading(true);
    setError(null);
    try {
      if (process.env.NODE_ENV === "development" && detail) {
        console.log("[LiveNotification] Accept/Reject payload:", { type, detail });
      }
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
        await updateOrderStatus(token, restaurantId, itemId, status === "confirmed" ? "confirmed" : "rejected");
      }

      setSuccess(true);
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
      className="relative w-full overflow-hidden rounded-2xl bg-wood-900 p-4 text-left shadow-xl border border-wood-300 dark:border-wood-600 text-wood-100"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
          {isReservation ? (
            <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          ) : (
            <svg className="h-5 w-5 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-wood-100">{title}</h3>
          <p className="text-sm text-wood-200 truncate">{message}</p>
        </div>
      </div>

      {detail && (
        <div className="mt-3 rounded-xl bg-wood-800 p-3 dark:bg-wood-800/50 text-sm text-wood-100 max-h-32 overflow-y-auto">
          {type === "reservation" && (
            <ul className="space-y-1">
              <li><strong className="text-wood-100">Date:</strong> {getReservationDateTimeText(detail)}</li>
              <li><strong className="text-wood-100">Party:</strong> {detail.party_size != null ? `${detail.party_size} guest${Number(detail.party_size) === 1 ? "" : "s"}` : "—"}</li>
              <li><strong className="text-wood-100">Customer:</strong> <span className="notranslate" translate="no">{detail.customer_name || detail.user?.name}</span></li>
              {detail.special_requests && <li className="truncate"><strong>Notes:</strong> {detail.special_requests}</li>}
            </ul>
          )}
          {type === "order" && (
            <ul className="space-y-1">
              <li><strong className="text-wood-100">Date:</strong> {getOrderDateTimeText(detail)}</li>
              <li><strong className="text-wood-100">Total:</strong> {formatCurrencyEUROrDash(detail.total_amount)}</li>
              <li><strong className="text-wood-100">Type:</strong> {detail.order_type ?? (detail.delivery_address?.toLowerCase?.().includes("pickup") ? "Pickup" : "Delivery") ?? "—"}</li>
              <li><strong className="text-wood-100">Customer:</strong> <span className="notranslate" translate="no">{detail.customer_name || detail.user?.name || "—"}</span></li>
              {(() => {
                const lines = getOrderLineItems(detail);
                if (lines.length === 0) return null;
                return (
                  <li>
                    <strong className="text-wood-100">Items:</strong>{" "}
                    <span className="notranslate" translate="no">
                      {lines.map((i) => getLineItemDisplayName(i)).filter(Boolean).join(", ")}
                    </span>
                  </li>
                );
              })()}
              {(detail.delivery_instructions || detail.notes) && <li className="truncate"><strong>Notes:</strong> {detail.delivery_instructions || detail.notes}</li>}
            </ul>
          )}
        </div>
      )}

      {error && <p className="mt-2 text-sm text-red-500 font-medium">{error}</p>}
      {success && <p className="mt-2 text-sm text-emerald-500 font-medium">Status updated!</p>}
      {resolved && !success && (
        <p className="mt-2 text-sm text-amber-300 font-medium">
          {detail?.handled_by
            ? `Handled by ${detail.handled_by} at ${detail?.handled_at ? formatReadableDateTime(detail.handled_at) || detail.handled_at : "another device"}.`
            : "Already handled from another tab/device."}
        </p>
      )}

      {isActionable && (
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => handleAction("confirmed")}
            disabled={loading}
            className="flex-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:outline-none disabled:opacity-50 transition-colors"
          >
            {loading ? "..." : "Accept"}
          </button>
          <button
            onClick={() => (isReservation ? openRejectDialog() : handleAction("rejected"))}
            disabled={loading}
            className="flex-1 rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600 focus:ring-2 focus:ring-red-500 focus:outline-none disabled:opacity-50 transition-colors"
          >
            {loading ? "..." : "Reject"}
          </button>
        </div>
      )}

      {showRejectDialog && (
        <div className="mt-3 rounded-xl border border-red-300 bg-red-950/30 p-3">
          <p className="text-sm font-medium text-red-200">Cancellation reason</p>
          <textarea
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            rows={3}
            placeholder="Enter reason for cancellation..."
            className="mt-2 w-full rounded-lg border border-red-300/40 bg-wood-900 px-3 py-2 text-sm text-wood-100 outline-none focus:border-red-300"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={closeRejectDialog}
              disabled={loading}
              className="flex-1 rounded-lg border border-wood-500 px-3 py-2 text-sm font-medium text-wood-100 hover:bg-wood-700 disabled:opacity-50"
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
            className="w-full rounded-xl bg-wood-700 px-3 py-2 text-sm font-medium text-wood-100 hover:bg-wood-600 transition-colors"
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
      className="flex max-w-sm gap-3 rounded-xl border border-emerald-200 bg-white p-4 shadow-xl dark:border-emerald-800 dark:bg-zinc-900"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/40">
        <svg className="h-5 w-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-zinc-900 dark:text-zinc-100">{title}</p>
        <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-400">
          {message}
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-2 text-xs font-medium text-emerald-600 underline hover:no-underline dark:text-emerald-400"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
