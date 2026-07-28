"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  getMyRestaurants,
  getRestaurantOrders,
  getOwnerRestaurantReservations,
} from "@/lib/api";
import { getConfiguredRestaurantIds } from "@/lib/restaurants";
import { toArray } from "@/lib/owner-utils";
import { useOwnerRefresh } from "@/context/OwnerRefreshContext";

function getOrderTotal(order) {
  const o = order?.order ?? order;
  const total = o?.total ?? o?.total_amount ?? o?.order_total ?? o?.amount ?? 0;
  return typeof total === "number" ? total : parseFloat(total) || 0;
}

function getReservationDate(r) {
  const res = r?.reservation ?? r;
  const iso = res?.reservation_datetime ?? res?.datetime ?? res?.reservation_date ?? res?.date;
  const time = res?.reservation_time ?? res?.time ?? "";
  if (iso && typeof iso === "string") {
    const d = new Date(iso.includes("T") ? iso : `${iso}T${time || "00:00"}`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const dateStr = (res?.reservation_date ?? res?.date ?? "").toString();
  const timeStr = (res?.reservation_time ?? res?.time ?? "").toString();
  if (dateStr) {
    const d = new Date(timeStr ? `${dateStr}T${timeStr}` : dateStr);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return null;
}

export default function OwnerDashboardPage() {
  const router = useRouter();
  const { token, isAuthenticated, loading: authLoading } = useAuth();
  const { registerRefresh } = useOwnerRefresh();
  const [restaurants, setRestaurants] = useState([]);
  const [overviewData, setOverviewData] = useState([]); // per-restaurant { restaurant, orders, reservations }
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadDashboardData = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError("");

    // First load all restaurants for this owner
    getMyRestaurants(token)
      .then(async (res) => {
        const all = toArray(res);
        if (!all || all.length === 0) {
          setRestaurants([]);
          setOverviewData([]);
          return;
        }

        const allowedIds = getConfiguredRestaurantIds();

        const filtered =
          allowedIds.length > 0 ? all.filter((r) => allowedIds.includes(Number(r.id))) : all;

        setRestaurants(filtered);

        // For each restaurant load its recent orders & reservations
        const perRestaurant = await Promise.all(
          filtered.map(async (r) => {
            try {
              const [ordersRes, reservationsRes] = await Promise.all([
                getRestaurantOrders(token, r.id),
                getOwnerRestaurantReservations(token, r.id),
              ]);
              const ordersRaw = toArray(ordersRes);
              const reservationsRaw = toArray(reservationsRes);

              const orders = [...ordersRaw].sort((a, b) => {
                const da = new Date(a?.created_at ?? a?.order?.created_at ?? 0).getTime();
                const db = new Date(b?.created_at ?? b?.order?.created_at ?? 0).getTime();
                return db - da;
              });
              const reservations = [...reservationsRaw].sort((a, b) => {
                const da = (getReservationDate(a) || new Date(0)).getTime();
                const db = (getReservationDate(b) || new Date(0)).getTime();
                return db - da;
              });

              return {
                restaurant: r,
                orders,
                reservations,
              };
            } catch (err) {
              // If one restaurant fails, record empty but continue others
              return {
                restaurant: r,
                orders: [],
                reservations: [],
                error: err?.message || err?.data?.message,
              };
            }
          })
        );

        setOverviewData(perRestaurant);
      })
      .catch((err) => {
        setError(err?.data?.message || err?.message || "Failed to load dashboard");
        setRestaurants([]);
        setOverviewData([]);
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

  // Note: we intentionally do NOT auto-refresh the overview on every
  // real-time event (to avoid too many API calls). Detailed restaurant
  // dashboards still use OwnerRefreshContext for live updates.

  if (authLoading || !isAuthenticated) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 text-center text-owner-muted">
        Loading owner dashboard…
      </div>
    );
  }

  const allOrders = overviewData.flatMap((r) => r.orders || []);
  const allReservations = overviewData.flatMap((r) => r.reservations || []);

  const totalRevenue = allOrders.reduce((sum, o) => sum + getOrderTotal(o), 0);
  const salesByDay = allOrders.reduce((acc, order) => {
    const o = order?.order ?? order;
    const date = o?.created_at ?? order?.created_at;
    const d = date ? new Date(date).toLocaleDateString() : "Unknown";
    acc[d] = (acc[d] || 0) + getOrderTotal(order);
    return acc;
  }, {});
  const maxDayRevenue = Math.max(...Object.values(salesByDay), 1);

  const iconClass = "text-owner-success";

  return (
    <div className="mx-auto max-w-6xl px-3 py-5 sm:px-4">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-owner-charcoal">
            Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-owner-muted">
            Overview across{" "}
            <span className="font-semibold">{restaurants.length || 0} restaurant(s)</span>
          </p>
        </div>
        {restaurants.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-owner-muted">Go to restaurant:</span>
            <select
              defaultValue=""
              onChange={(e) => {
                const id = e.target.value;
                if (id) router.push(`/owner/dashboard/${id}`);
              }}
              className="rounded-md border border-owner-border bg-white px-2.5 py-1.5 text-xs text-owner-charcoal shadow-sm"
            >
              <option value="" disabled>
                Select…
              </option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name ?? `Restaurant #${r.id}`}
                </option>
              ))}
            </select>
          </div>
        )}
      </header>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Sales overview */}
      <section className="mb-6">
        <h2 className="mb-3 text-sm font-semibold text-owner-charcoal">
          Sales overview
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="owner-card rounded-lg p-4">
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-owner-success/20 ${iconClass}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
            </div>
            <p className="text-xs font-medium text-owner-muted">Total revenue (recent)</p>
            <p className="mt-0.5 text-xl font-bold text-owner-charcoal">
              €{totalRevenue.toFixed(2)}
            </p>
            <p className="mt-0.5 text-[11px] text-owner-muted">From last 5 orders</p>
          </div>
          <div className="owner-card rounded-lg p-4">
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-owner-success/20 ${iconClass}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" />
              </svg>
            </div>
            <p className="text-xs font-medium text-owner-muted">Recent orders</p>
            <p className="mt-0.5 text-xl font-bold text-owner-charcoal">
              {allOrders.length}
            </p>
            <p className="mt-0.5 text-[11px] text-owner-muted">All restaurants</p>
          </div>
          <div className="owner-card rounded-lg p-4">
            <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-md bg-owner-success/20 ${iconClass}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <p className="text-xs font-medium text-owner-muted">Recent bookings</p>
            <p className="mt-0.5 text-xl font-bold text-owner-charcoal">
              {allReservations.length}
            </p>
            <p className="mt-0.5 text-[11px] text-owner-muted">All restaurants</p>
          </div>
        </div>

        {/* Sales by day */}
        {Object.keys(salesByDay).length > 0 && (
          <div className="owner-card mt-4 rounded-lg p-4">
            <h3 className="mb-3 text-xs font-semibold text-owner-charcoal">Sales by day</h3>
            <div className="space-y-2">
              {Object.entries(salesByDay).map(([day, revenue]) => (
                <div key={day} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 text-xs text-owner-muted">{day}</span>
                  <div className="min-w-0 flex-1 h-6 overflow-hidden rounded bg-owner-paper">
                    <div
                      className="h-full min-w-[4px] rounded bg-owner-success"
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

      <div className="mt-6 space-y-3">
        <h2 className="text-sm font-semibold text-owner-charcoal">
          Restaurants overview
        </h2>
        {loading && overviewData.length === 0 ? (
          <p className="text-xs text-owner-muted">Loading restaurants…</p>
        ) : restaurants.length === 0 ? (
          <div className="owner-card rounded-lg p-4">
            <p className="text-sm font-medium text-owner-charcoal">No Grill N Chill locations found for this account.</p>
            <p className="mt-1.5 text-xs text-owner-muted">
              If you own other restaurants on the platform, open the full selector.
            </p>
            <Link
              href="/owner/dashboard/select"
              className="mt-3 inline-flex items-center rounded-md bg-owner-action px-3 py-1.5 text-xs font-medium text-white hover:opacity-90"
            >
              Select a restaurant
            </Link>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {overviewData.map(({ restaurant, orders, reservations }) => {
              const revenue = (orders || []).reduce((sum, o) => sum + getOrderTotal(o), 0);
              const latestOrder = (orders || [])[0];
              const latestReservation = (reservations || [])[0];
              return (
                <section key={restaurant.id} className="owner-card rounded-lg p-4 flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-owner-charcoal">
                      {restaurant.name ?? `Restaurant #${restaurant.id}`}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-owner-muted">
                      ID {restaurant.id}
                      {restaurant.address ? ` · ${restaurant.address}` : ""}
                    </p>
                    <p className="mt-2 text-xs text-owner-muted">
                      Recent revenue:{" "}
                      <span className="font-semibold text-owner-charcoal">
                        €{revenue.toFixed(2)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-owner-muted">
                      Recent orders:{" "}
                      <span className="font-semibold text-owner-charcoal">
                        {(orders || []).length}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-owner-muted">
                      Recent bookings:{" "}
                      <span className="font-semibold text-owner-charcoal">
                        {(reservations || []).length}
                      </span>
                    </p>
                    {latestOrder && (
                      <p className="mt-1.5 text-[11px] text-owner-muted">
                        Last order:{" "}
                        {new Date(
                          (latestOrder.order?.created_at ?? latestOrder.created_at) || 0
                        ).toLocaleString()}
                      </p>
                    )}
                    {latestReservation && (
                      <p className="mt-0.5 text-[11px] text-owner-muted">
                        Last booking:{" "}
                        {(getReservationDate(latestReservation) || new Date(0)).toLocaleString()}
                      </p>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <Link
                      href={`/owner/dashboard/${restaurant.id}`}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-owner-action px-3 py-2 text-xs font-medium text-white hover:opacity-90 transition-opacity"
                    >
                      Open dashboard
                    </Link>
                    <Link
                      href={`/owner/dashboard/${restaurant.id}?tab=orders`}
                      className="inline-flex items-center justify-center rounded-md border border-owner-border px-2.5 py-2 text-[11px] font-medium text-owner-charcoal hover:bg-owner-paper"
                    >
                      Orders
                    </Link>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
