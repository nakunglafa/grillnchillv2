/** Primary restaurant for owner URLs in this deployment (public env or fallback). */
export const OWNER_PRIMARY_RESTAURANT_ID =
  process.env.NEXT_PUBLIC_RESTAURANT_ID || "5";

export function ownerPrimaryDashboardHref() {
  return `/owner/dashboard/${OWNER_PRIMARY_RESTAURANT_ID}`;
}
