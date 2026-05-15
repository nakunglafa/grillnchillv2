import { redirect } from "next/navigation";
import { ownerPrimaryDashboardHref } from "@/lib/owner-dashboard-path";

export default function OwnerDashboardEntryPage() {
  redirect(ownerPrimaryDashboardHref());
}
