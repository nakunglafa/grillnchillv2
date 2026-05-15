"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Bottom-right toast notification.
 * @param {{ message: string | null; type?: 'error' | 'success' | 'info'; onClose: () => void; duration?: number }} props
 */
export function Toast({ message, type = "error", onClose, duration: durationProp }) {
  const pathname = usePathname();
  const isOwnerRoute = pathname?.startsWith("/owner") ?? false;
  const duration = durationProp ?? (isOwnerRoute ? 2000 : 6000);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [message, duration, onClose]);

  if (!message) return null;

  /* No `dark:*` classes: owner layout uses `.owner-theme [class*="dark:bg-"] { inherit }` which
   * breaks any utility containing the substring "dark:bg" even when OS theme is light. */
  const styles = {
    error:
      "border border-red-300 bg-red-50 text-red-950 shadow-lg ring-1 ring-red-200/80",
    success:
      "border border-emerald-300 bg-emerald-50 text-emerald-950 shadow-lg ring-1 ring-emerald-200/80",
    info: "border border-zinc-300 bg-white text-zinc-950 shadow-lg ring-1 ring-zinc-200/80",
  };

  const iconStyles = {
    error: "text-red-600",
    success: "text-emerald-600",
    info: "text-zinc-600",
  };

  const messageStyles = {
    error: "text-red-900",
    success: "text-emerald-900",
    info: "text-zinc-900",
  };

  const dismissStyles = {
    error: "text-red-800 hover:text-red-950",
    success: "text-emerald-800 hover:text-emerald-950",
    info: "text-zinc-700 hover:text-zinc-900",
  };

  const mobileBottomClass = isOwnerRoute
    ? "max-sm:!bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] max-sm:!pb-0"
    : "max-sm:bottom-6 max-sm:pb-[env(safe-area-inset-bottom)]";

  return (
    <div
      className={`fixed z-[110] max-w-sm rounded-xl p-4 bottom-6 right-6 left-auto max-sm:left-4 max-sm:right-4 ${mobileBottomClass} ${styles[type]}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <svg
          className={`mt-0.5 h-5 w-5 shrink-0 ${iconStyles[type]}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {type === "error" ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-medium ${messageStyles[type]}`}>{message}</p>
          <button
            type="button"
            onClick={onClose}
            className={`mt-2 text-xs font-medium underline underline-offset-2 hover:no-underline ${dismissStyles[type]}`}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
}
