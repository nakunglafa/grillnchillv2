"use client";

import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  getMyRestaurants,
  getRestaurantById,
  getRestaurantOrders,
  getRestaurantTables,
  getOwnerRestaurantReservations,
  getMenusForRestaurant,
} from "@/lib/api";
import { toArray, getOrderLineItems } from "@/lib/owner-utils";
import { EVENTS } from "@/context/RealTimeNotificationContext";
import { useOwnerRefresh } from "@/context/OwnerRefreshContext";
import { useScreenWakeLock, getKeepScreenOnPreference } from "@/hooks/useScreenWakeLock";
import { OrdersTab } from "@/components/owner/OrdersTab";
import { MenuTab } from "@/components/owner/MenuTab";
import { SpecialMenusTab } from "@/components/owner/SpecialMenusTab";
import { TablesTab } from "@/components/owner/TablesTab";
import { ReservationsTab } from "@/components/owner/ReservationsTab";
import { SettingsTab } from "@/components/owner/SettingsTab";
import { TestimonialsTab } from "@/components/owner/TestimonialsTab";
import { WebsiteContentTab } from "@/components/owner/WebsiteContentTab";
import { GalleryTab } from "@/components/owner/GalleryTab";
import { NotificationsTab } from "@/components/owner/NotificationsTab";
import { AboutTab } from "@/components/owner/AboutTab";
import { ownerPrimaryDashboardHref } from "@/lib/owner-dashboard-path";
import { useRealTimeNotifications } from "@/context/RealTimeNotificationContext";

const iconClass = "text-owner-success";
const iconSize = 18;

const TABS = [
  {
    id: "orders",
    label: "Orders",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </svg>
    ),
  },
  {
    id: "reservations",
    label: "Reservations",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    id: "notifications",
    label: "Notifications",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
    ),
  },
  {
    id: "menu",
    label: "Menu",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2" />
        <path d="M7 2v20" />
        <path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7" />
      </svg>
    ),
  },
  {
    id: "special-menus",
    label: "Special menus",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <polygon points="12 2 15 9 22 9 17 14 19 21 12 17 5 21 7 14 2 9 9 9 12 2" />
      </svg>
    ),
  },
  {
    id: "tables",
    label: "Tables",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <path d="M4 4h16v16H4z" />
        <path d="M4 12h16" />
        <path d="M12 4v16" />
      </svg>
    ),
  },
  {
    id: "website-content",
    label: "Website content",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <rect x="3" y="3" width="18" height="14" rx="2" />
        <path d="M8 21h8" />
        <path d="M12 17v4" />
      </svg>
    ),
  },
  {
    id: "gallery",
    label: "Gallery",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <circle cx="9" cy="9" r="2" />
        <path d="m21 15-4-4L7 21" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
  {
    id: "testimonials",
    label: "Testimonials",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    id: "about",
    label: "About",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
        <circle cx="12" cy="12" r="10" />
        <path d="M12 16v-4" />
        <path d="M12 8h.01" />
      </svg>
    ),
  },
];

/** Merge GET list rows with any line items captured from `.new.order` (same OrderResource shape). API eager-loads `items` on lists; cache still helps races and minimal `.OrderStatusUpdated` refetch timing. */
function mergeCachedBroadcastLines(ordersList, cacheRef) {
  return ordersList.map((o) => {
    const fromApi = getOrderLineItems(o);
    if (fromApi.length > 0) return o;
    const id = o?.id;
    const cached = id != null ? cacheRef.current.get(Number(id)) : null;
    return cached?.length ? { ...o, items: cached } : o;
  });
}

export default function OwnerDashboardRestaurantPage() {
  const params = useParams();
  const router = useRouter();
  const restaurantId = params.restaurantId;
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [orders, setOrders] = useState([]);
  const [tables, setTables] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [menus, setMenus] = useState([]);
  const [activeTab, setActiveTab] = useState("orders");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // Track if we've already fetched to avoid infinite loops
  const [hasLoaded, setHasLoaded] = useState(false);
  // Keep screen on when dashboard is open (mobile); preference from Settings
  const [keepScreenOn, setKeepScreenOn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const { notifications = [] } = useRealTimeNotifications();
  const unreadCount = notifications.filter(n => !n.read).length;

  const { registerRefresh } = useOwnerRefresh();
  /**
   * Line items from `.new.order` before refetch, or if GET list rows omit `items` temporarily.
   * Updated API docs: OrderResource list/detail eager-load `items`; `.OrderStatusUpdated` stays minimal—refetch fills lines.
   */
  const broadcastOrderLinesRef = useRef(new Map());

  // Apply screen wake lock when dashboard is open on mobile (Chrome etc.), if enabled in settings
  useScreenWakeLock(keepScreenOn);

  // Initialize keepScreenOn from localStorage after mount (client-only)
  useEffect(() => {
    setKeepScreenOn(getKeepScreenOnPreference());
  }, []);

  const loadData = useCallback(() => {
    if (!restaurantId || !token) return;
    setError("");
    setLoading(true);
    Promise.all([
      getMyRestaurants(token),
      getRestaurantById(restaurantId, token, true).catch(() => null),
      getRestaurantOrders(token, restaurantId),
      getRestaurantTables(token, restaurantId),
      getOwnerRestaurantReservations(token, restaurantId),
      getMenusForRestaurant(token, restaurantId),
    ])
      .then(([restRes, restDetailRes, oRes, tRes, rRes, mRes]) => {
        const restList = toArray(restRes);
        setRestaurants(restList);
        const restDetail = restDetailRes?.data ?? restDetailRes ?? restList.find((r) => String(r.id) === String(restaurantId));
        setRestaurant(restDetail || restList.find((r) => String(r.id) === String(restaurantId)));
        setOrders(mergeCachedBroadcastLines(toArray(oRes), broadcastOrderLinesRef));
        setTables(toArray(tRes));
        setReservations(toArray(rRes));
        setMenus(toArray(mRes));
      })
      .catch((err) => {
        setError(err?.message || err?.data?.message || "Failed to load dashboard");
      })
      .finally(() => {
        setLoading(false);
        setHasLoaded(true);
      });
  }, [restaurantId, token]);

  useEffect(() => {
    broadcastOrderLinesRef.current = new Map();
  }, [restaurantId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const rid = String(restaurantId ?? "");

    const rememberLines = (orderLike) => {
      if (!orderLike || typeof orderLike !== "object") return;
      const orid = orderLike.restaurant_id;
      if (orid != null && String(orid) !== rid) return;
      const oid = orderLike.id ?? orderLike.order_id;
      const lines = getOrderLineItems(orderLike);
      if (oid != null && lines.length) broadcastOrderLinesRef.current.set(Number(oid), lines);
    };

    const onNewOrder = (e) => {
      rememberLines(e.detail ?? {});
    };
    const onOrderUpdated = (e) => {
      const raw = e.detail ?? {};
      rememberLines(raw.order ?? raw.data?.order ?? raw);
    };

    window.addEventListener(EVENTS.NEW_ORDER, onNewOrder);
    window.addEventListener(EVENTS.ORDER_UPDATED, onOrderUpdated);
    return () => {
      window.removeEventListener(EVENTS.NEW_ORDER, onNewOrder);
      window.removeEventListener(EVENTS.ORDER_UPDATED, onOrderUpdated);
    };
  }, [restaurantId]);

  useEffect(() => {
    if (!isAuthenticated && !authLoading) {
      router.push(`/login?redirect=${encodeURIComponent(ownerPrimaryDashboardHref())}`);
      return;
    }
    if (!token || hasLoaded) return;
    
    // Use a small delay/timeout to avoid firing immediately on every re-render and rate-limiting the backend
    const timeoutId = setTimeout(() => {
      loadData();
    }, 100);
    return () => clearTimeout(timeoutId);
  }, [restaurantId, token, isAuthenticated, authLoading, router, loadData, hasLoaded]);

  useEffect(() => {
    // We only need to register the refresh context once per mount
    const unregister = registerRefresh(loadData);
    return () => {
      if (typeof unregister === 'function') unregister();
    };
  }, [registerRefresh, loadData]);

  const handleRestaurantChange = (e) => {
    const id = e.target.value;
    if (id) router.push(`/owner/dashboard/${id}`);
  };

  if (authLoading) return null;
  if (!isAuthenticated) return null;
  if (loading && !restaurant) {
    return (
      <div className="owner-theme-bg flex min-h-screen items-center justify-center">
        <p className="text-owner-charcoal">Loading dashboard...</p>
      </div>
    );
  }
  if (!restaurant && restaurants.length > 0) {
    router.replace(`/owner/dashboard/${restaurants[0].id}`);
    return null;
  }
  if (!restaurant && !loading) {
    return (
      <div className="owner-theme-bg flex min-h-screen flex-col items-center justify-center gap-4 px-4">
        <p className="text-owner-charcoal">Restaurant not found.</p>
        <Link
          href={
            restaurants.length > 1
              ? "/owner/dashboard/select"
              : ownerPrimaryDashboardHref()
          }
          className="touch-manipulation min-h-[48px] inline-flex items-center justify-center rounded-xl bg-owner-action px-6 py-4 text-base font-medium text-white hover:opacity-90"
        >
          {restaurants.length > 1 ? "Choose restaurant" : "Back to dashboard"}
        </Link>
      </div>
    );
  }

  const tabButtonBase = "touch-manipulation inline-flex items-center transition-colors active:scale-[0.98]";

  return (
    <div className="owner-theme-bg flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom,0px))] md:min-h-screen md:pb-0 md:flex-row md:items-start">
      {/* Mobile restaurant switcher (only if owner has multiple restaurants) */}
      {restaurants.length > 1 && (
        <div className="md:hidden border-b border-owner-border bg-owner-paper px-3 py-2">
          <select
            value={restaurantId}
            onChange={handleRestaurantChange}
            className="touch-manipulation h-9 w-full rounded-lg border border-owner-border bg-owner-card px-3 text-sm text-owner-charcoal"
          >
            {restaurants.map((r) => (
              <option key={r.id} value={r.id} className="bg-owner-card text-owner-charcoal">
                {r.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Desktop sidebar: sticky below owner header (60px), full viewport height */}
      <aside className="hidden md:flex md:flex-col sticky top-[60px] z-20 shrink-0 w-60 lg:w-64 h-[calc(100vh-60px)] overflow-y-auto border-r border-owner-border bg-owner-card shadow-[1px_0_4px_rgba(45,36,30,0.04)]">
          <div className="px-4 pt-5 pb-4 border-b border-owner-border/50">
            {restaurants.length > 1 && (
            <Link
              href="/owner/dashboard/select"
              aria-label="Switch restaurant"
              className="touch-manipulation inline-flex h-9 items-center gap-1.5 -ml-2 rounded-lg px-2 text-xs font-semibold uppercase tracking-wider text-owner-muted hover:bg-owner-paper hover:text-owner-charcoal"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                <path d="M19 12H5" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Restaurants
            </Link>
            )}
            <p className={`text-[10px] font-semibold uppercase tracking-widest text-owner-muted ${restaurants.length > 1 ? "mt-3" : ""}`}>
              Managing
            </p>
            <p className="mt-1 text-lg font-bold leading-tight text-owner-charcoal wrap-break-word">
              {restaurant?.name ?? `Restaurant #${restaurantId}`}
            </p>
            {restaurants.length > 1 && (
              <select
                value={restaurantId}
                onChange={handleRestaurantChange}
                className="touch-manipulation mt-3 h-10 w-full rounded-lg border border-owner-border bg-owner-card px-3 text-sm text-owner-charcoal"
              >
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id} className="bg-owner-card text-owner-charcoal">
                    {r.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Dashboard sections">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              const hasBadge = tab.id === "notifications" && unreadCount > 0;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={isActive ? "page" : undefined}
                  className={`${tabButtonBase} owner-tab-button-transition h-11 w-full justify-start gap-3 rounded-lg px-3 text-sm font-semibold ${
                    isActive
                      ? "bg-owner-action text-white shadow"
                      : "text-owner-charcoal hover:bg-owner-paper"
                  }`}
                >
                  <span className="shrink-0 relative">
                    {tab.icon}
                    {hasBadge && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-owner-card" />}
                  </span>
                  <span className="truncate">{tab.label}</span>
                </button>
              );
            })}
          </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 w-full p-4 md:p-6 text-xs md:text-sm">
        <div className="mx-auto w-full max-w-[1400px]">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
              <p className="text-sm text-red-600">{error}</p>
              <button
                type="button"
                onClick={loadData}
                className="touch-manipulation mt-2 min-h-[48px] rounded-lg bg-red-100 px-4 py-3 text-sm font-medium text-red-700"
              >
                Try again
              </button>
            </div>
          )}
          <div key={activeTab} className="owner-animate-tab">
          {activeTab === "orders" && (
            <OrdersTab
              orders={orders}
              restaurantId={restaurantId}
              token={token}
              onRefresh={loadData}
            />
          )}
          {activeTab === "menu" && (
            <MenuTab
              menus={menus}
              restaurantId={restaurantId}
              token={token}
              onRefresh={loadData}
            />
          )}
          {activeTab === "special-menus" && (
            <SpecialMenusTab
              restaurantId={restaurantId}
              token={token}
            />
          )}
          {activeTab === "tables" && (
            <TablesTab
              tables={tables}
              restaurantId={restaurantId}
              token={token}
              onRefresh={loadData}
            />
          )}
          {activeTab === "reservations" && (
            <ReservationsTab
              reservations={reservations}
              restaurantId={restaurantId}
              token={token}
              onRefresh={loadData}
            />
          )}
          {activeTab === "notifications" && (
            <NotificationsTab />
          )}
          {activeTab === "settings" && (
            <SettingsTab
              restaurant={restaurant}
              restaurantId={restaurantId}
              token={token}
              onRefresh={loadData}
              onRestaurantUpdate={(updated) => {
                if (updated && typeof updated === "object") {
                  setRestaurant((prev) => (prev ? { ...prev, ...updated } : updated));
                }
              }}
              keepScreenOn={keepScreenOn}
              onKeepScreenOnChange={setKeepScreenOn}
            />
          )}
          {activeTab === "testimonials" && (
            <TestimonialsTab
              restaurantId={restaurantId}
              token={token}
              restaurant={restaurant}
              onRestaurantUpdate={(updated) => {
                if (updated && typeof updated === "object") {
                  setRestaurant((prev) => (prev ? { ...prev, ...updated } : updated));
                }
              }}
            />
          )}
          {activeTab === "website-content" && (
            <WebsiteContentTab restaurantId={restaurantId} token={token} />
          )}
          {activeTab === "gallery" && (
            <GalleryTab restaurantId={restaurantId} token={token} />
          )}
          {activeTab === "about" && (
            <AboutTab />
          )}
          </div>
        </div>
      </main>

      {/* Mobile Settings Menu Modal */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-10 flex flex-col justify-end">
          <button
            type="button"
            className="owner-animate-modal-backdrop absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close menu"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div
            className="owner-animate-modal-sheet relative w-full rounded-t-3xl border border-owner-border border-b-0 bg-owner-card p-5 shadow-2xl pb-[calc(80px+env(safe-area-inset-bottom))]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-owner-charcoal">More Options</h2>
              <button 
                type="button" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-full p-2 text-owner-muted hover:bg-owner-paper hover:text-owner-charcoal"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {TABS.filter((tab) => tab.id !== "orders" && tab.id !== "reservations" && tab.id !== "notifications").map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setIsMobileMenuOpen(false);
                  }}
                  className={`owner-tab-button-transition flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-transform active:scale-[0.97] ${
                    activeTab === tab.id 
                      ? "bg-owner-action/10 border-owner-action/30 text-owner-action" 
                      : "border-owner-border bg-owner-paper text-owner-charcoal hover:border-owner-action/50"
                  }`}
                >
                  <span className="shrink-0">{tab.icon}</span>
                  <span className="font-medium text-xs tracking-wide">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mobile: fixed bottom nav */}
      <nav
        aria-label="Dashboard sections"
        className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex items-center justify-around border-t border-owner-walnut/20 bg-owner-walnut/95 py-2 pb-[env(safe-area-inset-bottom)] backdrop-blur text-owner-nav"
      >
        {TABS.filter((tab) => tab.id === "orders" || tab.id === "reservations").map((tab) => {
          const isActive = activeTab === tab.id && !isMobileMenuOpen;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setIsMobileMenuOpen(false);
              }}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={`${tabButtonBase} owner-tab-button-transition flex flex-col h-14 min-w-[72px] items-center justify-center gap-1 rounded-lg px-1 ${
                isActive ? "bg-owner-action text-white shadow" : "text-owner-nav hover:bg-white/10"
              }`}
            >
              <span className="shrink-0">{tab.icon}</span>
              <span className="text-[10px] font-medium leading-none tracking-wide">{tab.label}</span>
            </button>
          );
        })}
        
        {/* Settings / More button */}
        <button
          type="button"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="More Settings"
          className={`${tabButtonBase} owner-tab-button-transition flex flex-col h-14 min-w-[72px] items-center justify-center gap-1 rounded-lg px-1 transition-all ${
            !["orders", "reservations", "notifications"].includes(activeTab) || isMobileMenuOpen ? "bg-owner-action text-white shadow" : "text-owner-nav hover:bg-white/10"
          }`}
        >
          <span className="shrink-0">
            {TABS.find(t => t.id === "settings")?.icon || (
              <svg xmlns="http://www.w3.org/2000/svg" width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={iconClass}>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            )}
          </span>
          <span className="text-[10px] font-medium leading-none tracking-wide">Settings</span>
        </button>

        {/* Notifications button on the far right */}
        {TABS.filter((tab) => tab.id === "notifications").map((tab) => {
          const isActive = activeTab === tab.id && !isMobileMenuOpen;
          const hasBadge = unreadCount > 0;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setIsMobileMenuOpen(false);
              }}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              className={`${tabButtonBase} owner-tab-button-transition flex flex-col h-14 min-w-[72px] items-center justify-center gap-1 rounded-lg px-1 ${
                isActive ? "bg-owner-action text-white shadow" : "text-owner-nav hover:bg-white/10"
              }`}
            >
              <span className="shrink-0 relative">
                {tab.icon}
                {hasBadge && <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 rounded-full bg-red-500 ring-1 ring-owner-walnut" />}
              </span>
              <span className="text-[10px] font-medium leading-none tracking-wide">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
