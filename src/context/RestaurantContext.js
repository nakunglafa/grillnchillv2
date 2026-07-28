"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getRestaurant } from "@/lib/api";
import {
  CONFIGURED_RESTAURANTS,
  getDefaultRestaurantId,
  isConfiguredRestaurantId,
} from "@/lib/restaurants";

const STORAGE_KEY = "active_restaurant_id";

const RestaurantContext = createContext(null);

function readStoredId() {
  if (typeof window === "undefined") return getDefaultRestaurantId();
  const stored = window.localStorage.getItem(STORAGE_KEY);
  const parsed = stored ? Number(stored) : NaN;
  if (!Number.isNaN(parsed) && isConfiguredRestaurantId(parsed)) return parsed;
  return getDefaultRestaurantId();
}

export function RestaurantProvider({ children }) {
  const [activeId, setActiveIdState] = useState(getDefaultRestaurantId);
  const [hydrated, setHydrated] = useState(false);
  const [restaurants, setRestaurants] = useState(CONFIGURED_RESTAURANTS);

  useEffect(() => {
    setActiveIdState(readStoredId());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || !activeId) return;
    window.localStorage.setItem(STORAGE_KEY, String(activeId));
  }, [activeId, hydrated]);

  useEffect(() => {
    let cancelled = false;

    async function enrich() {
      const results = await Promise.all(
        CONFIGURED_RESTAURANTS.map(async (base) => {
          try {
            const data = await getRestaurant(base.id);
            const api = data?.data || data?.restaurant || data;
            const name = api?.name?.trim();
            const address = api?.address?.trim() || "";
            const phone = api?.phone?.trim() || "";
            const logoUrl = api?.logo_url || api?.logoUrl || "";
            return {
              ...base,
              name: name || base.label,
              label: name || base.label,
              address: address || base.addressFallback || "",
              phone,
              logoUrl,
            };
          } catch {
            return {
              ...base,
              name: base.label,
              address: base.addressFallback || "",
              phone: "",
              logoUrl: "",
            };
          }
        })
      );
      if (!cancelled) setRestaurants(results);
    }

    if (CONFIGURED_RESTAURANTS.length) enrich();
    return () => {
      cancelled = true;
    };
  }, []);

  const setActiveRestaurantId = useCallback((id) => {
    const n = Number(id);
    if (!isConfiguredRestaurantId(n)) return;
    setActiveIdState(n);
  }, []);

  const value = useMemo(
    () => ({
      restaurants,
      activeRestaurantId: activeId,
      setActiveRestaurantId,
      activeRestaurant: restaurants.find((r) => r.id === activeId) || null,
      hydrated,
    }),
    [restaurants, activeId, setActiveRestaurantId, hydrated]
  );

  return (
    <RestaurantContext.Provider value={value}>{children}</RestaurantContext.Provider>
  );
}

export function useRestaurant() {
  const ctx = useContext(RestaurantContext);
  if (!ctx) throw new Error("useRestaurant must be used within RestaurantProvider");
  return ctx;
}
