"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRestaurant } from "@/context/RestaurantContext";
import { getSlugForId, getDefaultLocationSlug, menuPath } from "@/lib/restaurants";

/** Legacy flat /menu → /{slug}/menu for the active (or default) location. */
export default function MenuRedirectPage() {
  const router = useRouter();
  const { activeRestaurantId, hydrated } = useRestaurant();

  useEffect(() => {
    if (!hydrated) return;
    const slug = getSlugForId(activeRestaurantId) || getDefaultLocationSlug();
    router.replace(slug ? menuPath(slug) : "/");
  }, [hydrated, activeRestaurantId, router]);

  return (
    <div className="flex min-h-[40vh] items-center justify-center bg-[#0a0908] text-white/70">
      Opening menu…
    </div>
  );
}
