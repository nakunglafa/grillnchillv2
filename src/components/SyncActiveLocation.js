"use client";

import { useEffect } from "react";
import { useRestaurant } from "@/context/RestaurantContext";

/** Syncs RestaurantContext active ID when entering a slug-based location route. */
export function SyncActiveLocation({ restaurantId }) {
  const { setActiveRestaurantId, activeRestaurantId } = useRestaurant();

  useEffect(() => {
    const id = Number(restaurantId);
    if (!id || Number.isNaN(id)) return;
    if (activeRestaurantId !== id) {
      setActiveRestaurantId(id);
    }
  }, [restaurantId, activeRestaurantId, setActiveRestaurantId]);

  return null;
}
