"use client";

import { useRealTimeNotifications } from "@/context/RealTimeNotificationContext";
import { formatCurrencyEUROrDash } from "@/lib/format-currency";

function formatReadableDateTime(value) {
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
}

export function NotificationsTab() {
  const { notifications = [], markAsRead, markAllAsRead, clearNotifications } = useRealTimeNotifications();

  if (notifications.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-owner-border bg-owner-card p-12 text-center shadow-sm">
        <svg xmlns="http://www.w3.org/2000/svg" width={48} height={48} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="mb-4 text-owner-muted opacity-50">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        <p className="text-lg font-medium text-owner-charcoal">No notifications yet</p>
        <p className="text-sm text-owner-muted mt-1">New orders and reservations will appear here.</p>
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-owner-card p-4 rounded-xl border border-owner-border shadow-sm">
        <h2 className="text-lg font-bold text-owner-charcoal flex items-center gap-2">
          Notifications
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {unreadCount} new
            </span>
          )}
        </h2>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-sm font-medium text-owner-action hover:text-owner-action/80 transition-colors px-3 py-1.5 rounded-md hover:bg-owner-paper"
            >
              Mark all as read
            </button>
          )}
          <button
            onClick={clearNotifications}
            className="text-sm font-medium text-owner-muted hover:text-red-600 transition-colors px-3 py-1.5 rounded-md hover:bg-owner-paper"
          >
            Clear all
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {notifications.map((notif) => {
          const isUnread = !notif.read;
          const { detail, type } = notif;
          const isReservation = type.startsWith("reservation");
          const isUpdate = type.endsWith("-update");
          const restaurantName = detail?.restaurant?.name ?? detail?.restaurant_name ?? "Restaurant";
          const customerName = detail?.customer_name ?? detail?.user?.name ?? "A customer";

          let title = "Notification";
          let body = "";

          if (isReservation) {
            title = isUpdate ? `Reservation Update at ${restaurantName}` : `New Reservation at ${restaurantName}`;
            const status = detail?.status || detail?.state;
            body = isUpdate 
              ? `Reservation for ${customerName} has been updated${status ? ` to: ${status}` : ""}.`
              : `New reservation by ${customerName} for ${detail?.party_size || "unknown"} guests on ${detail?.reservation_date || ""} ${detail?.reservation_time || ""}.`;
          } else if (type.startsWith("order")) {
            title = isUpdate ? `Order Update for ${restaurantName}` : `New Order for ${restaurantName}`;
            const status = detail?.status || detail?.order_status || detail?.state;
            body = isUpdate
              ? `Order for ${customerName} has been updated${status ? ` to: ${status}` : ""}.`
              : `New order from ${customerName}. Total: ${formatCurrencyEUROrDash(detail?.total_amount)}.`;
          }

          return (
            <div 
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              className={`relative cursor-pointer overflow-hidden rounded-xl border p-4 text-left transition-all hover:border-owner-action/50 ${
                isUnread 
                  ? "border-owner-border bg-white shadow-md ring-1 ring-owner-action/10" 
                  : "border-owner-border/50 bg-owner-paper/50 opacity-70"
              }`}
            >
              {isUnread && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-owner-action" />
              )}
              <div className="flex items-start gap-4 pl-2">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
                  isReservation ? (isUnread ? "bg-emerald-100" : "bg-emerald-50") : (isUnread ? "bg-amber-100" : "bg-amber-50")
                }`}>
                  {isReservation ? (
                    <svg className={`h-5 w-5 ${isUnread ? "text-emerald-700" : "text-emerald-700/50"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className={`h-5 w-5 ${isUnread ? "text-amber-800" : "text-amber-800/50"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className={`font-bold truncate ${isUnread ? "text-owner-charcoal" : "text-owner-muted"}`}>{title}</h3>
                    <span className="text-xs text-owner-muted whitespace-nowrap">
                      {formatReadableDateTime(notif.createdAt)}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm ${isUnread ? "text-owner-muted" : "text-owner-muted/70"}`}>
                    {body}
                  </p>
                  {isUnread && (
                    <p className="mt-2 text-xs font-semibold text-owner-action">
                      Tap to mark as read
                    </p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
