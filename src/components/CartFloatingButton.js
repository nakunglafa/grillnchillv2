"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/context/CartContext";
import { useOrderingHours } from "@/context/OrderingHoursContext";
import { formatCurrencyEURZero as formatPrice } from "@/lib/format-currency";
import { useLocalizedPath } from "@/lib/use-locale";

export function CartFloatingButton() {
  const pathname = usePathname();
  const lp = useLocalizedPath();
  const { totalItems, totalAmount } = useCart();
  const { orderingAccepting, openingSlots } = useOrderingHours();
  const closedNow =
    Array.isArray(openingSlots) && openingSlots.length > 0 && !orderingAccepting;

  if (totalItems === 0) return null;

  const onMenu =
    pathname === "/menu" ||
    pathname?.startsWith("/menu/") ||
    Boolean(pathname?.match(/^\/[^/]+\/menu\/?$/)) ||
    Boolean(pathname?.match(/^\/[a-z]{2}\/[^/]+\/menu\/?$/));
  const positionClass = onMenu
    ? "fixed bottom-24 right-4 z-[60] flex items-center gap-3 rounded-xl px-5 py-3 font-medium shadow-lg transition lg:bottom-8 lg:right-8"
    : "fixed bottom-6 right-6 z-40 flex items-center gap-3 rounded-xl px-5 py-3 font-medium shadow-lg transition md:bottom-8 md:right-8";

  return (
    <Link
      href={lp("/checkout")}
      className={`${positionClass} bg-accent text-wood-950 shadow-lg hover:bg-accent-hover`}
      style={{ marginBottom: "env(safe-area-inset-bottom, 0)" }}
      aria-label={
        closedNow
          ? `Schedule takeaway for later with ${totalItems} items`
          : `Proceed to checkout with ${totalItems} items`
      }
    >
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      <span>
        {closedNow ? "Schedule order" : "Proceed to Cart"} ({totalItems}) · {formatPrice(totalAmount)}
      </span>
    </Link>
  );
}
