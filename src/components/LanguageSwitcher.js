"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LOCALES,
  LOCALE_LABELS,
  DEFAULT_LOCALE,
  isLocale,
  stripLocaleFromPathname,
  localizedPath,
} from "@/lib/i18n";

/**
 * Click-to-open locale menu (no Google Translate).
 */
export default function LanguageSwitcher() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const isOwner = pathname.startsWith("/owner");

  const segments = pathname.split("/").filter(Boolean);
  const current = isLocale(segments[0]) ? segments[0] : DEFAULT_LOCALE;
  const bare = stripLocaleFromPathname(pathname);

  useEffect(() => {
    if (!open || isOwner) return undefined;
    const onPointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, isOwner]);

  if (isOwner) return null;

  return (
    <div
      ref={rootRef}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-[65]"
      style={{ marginRight: "env(safe-area-inset-right, 0)" }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-[#2a0f14]/92 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-white shadow-lg backdrop-blur-md transition hover:bg-[#2a0f14]"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Language"
      >
        <span className="text-accent">{current}</span>
        <span className="text-white/70">{LOCALE_LABELS[current]}</span>
        <svg
          className={`h-3.5 w-3.5 text-white/60 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.167l3.71-3.936a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open ? (
        <ul
          role="listbox"
          aria-label="Choose language"
          className="absolute bottom-full right-0 mb-2 min-w-[11rem] overflow-hidden rounded-xl border border-white/15 bg-[#2a0f14]/96 py-1 shadow-xl backdrop-blur-md"
        >
          {LOCALES.map((loc) => {
            const href = localizedPath(loc, bare);
            const active = loc === current;
            return (
              <li key={loc} role="option" aria-selected={active}>
                <Link
                  href={href}
                  hrefLang={loc}
                  lang={loc}
                  onClick={() => setOpen(false)}
                  className={`flex items-center justify-between gap-3 px-3 py-2 text-sm transition ${
                    active
                      ? "bg-accent/20 font-semibold text-accent"
                      : "text-white/85 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span>{LOCALE_LABELS[loc]}</span>
                  <span className="text-[11px] uppercase tracking-wide text-white/50">{loc}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
