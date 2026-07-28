import { getDefaultRestaurantId } from "@/lib/restaurants";

/** Owner overview / select — multi-location deployments do not hard-pin one ID. */
export function ownerPrimaryDashboardHref() {
  return "/owner/dashboard";
}

/** First configured location (fallback for legacy single-ID helpers). */
export const OWNER_PRIMARY_RESTAURANT_ID = String(getDefaultRestaurantId() ?? "");
