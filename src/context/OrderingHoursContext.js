"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getRestaurant } from "@/lib/api";
import { useRestaurant } from "@/context/RestaurantContext";
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  extractOpeningSlotsFromRestaurantPayload,
  isRestaurantOpenForOrdering,
} from "@/lib/opening-hours";

const OrderingHoursContext = createContext(null);

/**
 * @typedef {{ openingSlots: unknown[] | null, orderingAccepting: boolean, timeZone: string }} OrderingHoursValue
 */

export function OrderingHoursProvider({ children }) {
  const { activeRestaurantId } = useRestaurant();
  const [openingSlots, setOpeningSlots] = useState(null);
  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (!activeRestaurantId) {
      setOpeningSlots([]);
      return undefined;
    }
    let cancelled = false;
    setOpeningSlots(null);
    getRestaurant(activeRestaurantId)
      .then((data) => {
        if (cancelled) return;
        const slots = extractOpeningSlotsFromRestaurantPayload(data);
        setOpeningSlots(Array.isArray(slots) ? slots : []);
      })
      .catch(() => {
        if (!cancelled) setOpeningSlots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRestaurantId]);

  useEffect(() => {
    const id = window.setInterval(() => setTick(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const value = useMemo(() => {
    const tz = DEFAULT_RESTAURANT_TIMEZONE;
    const slots = openingSlots;
    /** While loading (null), allow UX — same as “no schedule” until we know otherwise. */
    const orderingAccepting =
      slots === null ? true : isRestaurantOpenForOrdering(slots, tz, new Date(tick));

    return {
      openingSlots: slots,
      orderingAccepting,
      /** IANA timezone used for opening_hours (see NEXT_PUBLIC_RESTAURANT_TIMEZONE). */
      timeZone: tz,
    };
  }, [openingSlots, tick]);

  return <OrderingHoursContext.Provider value={value}>{children}</OrderingHoursContext.Provider>;
}

export function useOrderingHours() {
  const ctx = useContext(OrderingHoursContext);
  if (!ctx) throw new Error("useOrderingHours must be used within OrderingHoursProvider");
  return ctx;
}
