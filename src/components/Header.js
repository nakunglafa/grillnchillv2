"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { useRestaurant } from "@/context/RestaurantContext";
import { getRestaurant } from "@/lib/api";
import { isOwner } from "@/lib/owner-utils";
import { ownerPrimaryDashboardHref } from "@/lib/owner-dashboard-path";
import { CartDrawer } from "@/components/CartDrawer";
import {
  getDefaultLocationSlug,
  getSlugForId,
  locationPath,
  menuPath,
} from "@/lib/restaurants";

function SocialRow({ className, socialLinks }) {
  const icon = "h-4 w-4";
  const xUrl = String(socialLinks?.x ?? "").trim();
  const facebookUrl = String(socialLinks?.facebook ?? "").trim();
  const instagramUrl = String(socialLinks?.instagram ?? "").trim();
  const tiktokUrl = String(socialLinks?.tiktok ?? "").trim();
  const googleMapsUrl = String(socialLinks?.google_maps ?? "").trim();
  const tripadvisorUrl = String(socialLinks?.tripadvisor ?? "").trim();
  const hasAny =
    xUrl || facebookUrl || instagramUrl || tiktokUrl || googleMapsUrl || tripadvisorUrl;

  if (!hasAny) return null;

  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      {facebookUrl && (
        <a href={facebookUrl} target="_blank" rel="noopener noreferrer" className="opacity-90 transition-opacity hover:opacity-100" aria-label="Facebook">
          <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </a>
      )}
      {instagramUrl && (
        <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="opacity-90 transition-opacity hover:opacity-100" aria-label="Instagram">
          <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        </a>
      )}
      {xUrl && (
        <a href={xUrl} target="_blank" rel="noopener noreferrer" className="opacity-90 transition-opacity hover:opacity-100" aria-label="X">
          <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      )}
      {tiktokUrl && (
        <a href={tiktokUrl} target="_blank" rel="noopener noreferrer" className="opacity-90 transition-opacity hover:opacity-100" aria-label="TikTok">
          <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M16.6 5.82a4.77 4.77 0 0 0 2.8.9V9.5a7.56 7.56 0 0 1-2.8-.52v5.17c0 2.97-2.41 5.38-5.38 5.38s-5.38-2.41-5.38-5.38 2.41-5.38 5.38-5.38c.26 0 .52.02.77.06v2.83a2.56 2.56 0 0 0-.77-.12 2.61 2.61 0 1 0 2.61 2.61V2.5h2.77v.18c0 1.2.48 2.35 1.33 3.14z" />
          </svg>
        </a>
      )}
      {googleMapsUrl && (
        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="opacity-90 transition-opacity hover:opacity-100" aria-label="Google Maps">
          <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
          </svg>
        </a>
      )}
      {tripadvisorUrl && (
        <a href={tripadvisorUrl} target="_blank" rel="noopener noreferrer" className="opacity-90 transition-opacity hover:opacity-100" aria-label="TripAdvisor">
          <svg className={icon} fill="none" viewBox="0 0 24 24" aria-hidden>
            <path d="M4 8.5c1.3-.9 3-1.5 5-1.7L12 4l3 2.8c2 .2 3.7.8 5 1.7M7.2 15.1l2.3 2.2c1.4 1.3 3.7 1.3 5.1 0l2.3-2.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="8.3" cy="12.2" r="3.2" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="15.7" cy="12.2" r="3.2" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="8.3" cy="12.2" r="1" fill="currentColor" />
            <circle cx="15.7" cy="12.2" r="1" fill="currentColor" />
            <path d="M11 12.2h2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </a>
      )}
    </div>
  );
}

/**
 * @param {{ variant?: "default" | "overlay" | "marketing" }} props
 */
export function Header({ variant = "default" }) {
  const pathname = usePathname();
  const { user, isAuthenticated, logout, loading } = useAuth();
  const { totalItems, hydrate } = useCart();
  const { restaurants, activeRestaurantId, setActiveRestaurantId } = useRestaurant();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const brandName =
    process.env.NEXT_PUBLIC_RESTAURANT_NAME_PREFIX?.trim() ||
    process.env.NEXT_PUBLIC_RESTAURANT_NAME?.trim() ||
    "Grill N Chill";
  const [socialLinks, setSocialLinks] = useState(null);
  const [resLoading, setResLoading] = useState(true);

  useEffect(() => {
    if (!activeRestaurantId) {
      setSocialLinks(null);
      setResLoading(false);
      return undefined;
    }
    let cancelled = false;
    setResLoading(true);
    getRestaurant(activeRestaurantId)
      .then((data) => {
        if (cancelled) return;
        const api = data?.restaurant ?? data?.data ?? data;
        if (api?.social_links && typeof api.social_links === "object") {
          setSocialLinks(api.social_links);
        } else {
          setSocialLinks(null);
        }
      })
      .catch(() => {
        if (!cancelled) setSocialLinks(null);
      })
      .finally(() => {
        if (!cancelled) setResLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeRestaurantId]);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const onPointerDown = (event) => {
      if (!accountMenuRef.current) return;
      if (!accountMenuRef.current.contains(event.target)) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [accountMenuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const activeSlug = getSlugForId(activeRestaurantId) || getDefaultLocationSlug();
  const activeMenuHref = activeSlug ? menuPath(activeSlug) : "/menu";
  const activeLocationHref = activeSlug ? locationPath(activeSlug) : "/";

  const overlay = variant === "overlay";
  const marketing = variant === "marketing";
  const siteChrome = overlay || marketing;

  const headerBarClass = marketing
    ? "sticky top-0 z-50 border-b backdrop-blur-md"
    : overlay
      ? "sticky top-0 z-50 border-b backdrop-blur-md"
      : "sticky top-0 z-30 border-b backdrop-blur-xl";

  const headerStyle = siteChrome
    ? {
        backgroundColor: marketing ? "var(--site-header-bg-solid)" : "var(--site-header-bg)",
        borderColor: "var(--site-header-border)",
        color: "var(--site-header-fg)",
      }
    : {
        backgroundColor: "var(--site-header-bg-solid)",
        borderColor: "var(--site-header-border)",
        color: "var(--site-header-fg)",
      };

  const navLink =
    "inline-flex min-h-9 items-center px-2 text-sm font-semibold text-[color:var(--site-header-muted)] hover:text-[color:var(--site-header-fg)] transition-colors";
  const locationLink = (active) =>
    `inline-flex min-h-9 items-center px-2 text-sm font-semibold transition-colors ${
      active
        ? "text-[color:var(--site-header-fg)] underline underline-offset-4"
        : "text-[color:var(--site-header-muted)] hover:text-[color:var(--site-header-fg)]"
    }`;
  const ctaSecondary =
    "inline-flex min-h-9 items-center rounded-md border border-[color:var(--site-header-border)] bg-transparent px-3 py-1.5 text-sm font-semibold text-[color:var(--site-header-fg)] hover:bg-white/10 transition-colors";
  const ctaPrimary =
    "inline-flex min-h-9 items-center rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-wood-950 hover:bg-accent-hover transition-colors";
  const cartBtn =
    "relative rounded-md p-2 text-[color:var(--site-header-fg)] hover:bg-white/10 hover:text-accent transition-colors";
  const accountDrop =
    "absolute right-0 top-full z-50 mt-1.5 w-52 rounded-lg border border-[color:var(--site-header-border)] bg-[color:var(--site-header-bg-solid)] p-1.5 shadow-xl backdrop-blur-md";
  const accountItem =
    "block rounded-md px-3 py-2 text-sm font-medium text-[color:var(--site-header-fg)] hover:bg-white/10";

  return (
    <header className={headerBarClass} style={headerStyle}>
      <div
        className="relative mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 sm:px-5"
        style={{ minHeight: "var(--site-header-height)" }}
      >
        <div className="flex min-w-0 items-center gap-3 lg:gap-5">
          <Link
            href="/"
            className="shrink-0 font-display text-xl font-semibold tracking-tight text-[color:var(--site-header-fg)] sm:text-2xl"
            onClick={closeMenu}
          >
            {resLoading ? (
              <div className="h-6 w-28 animate-pulse rounded-md bg-white/20" />
            ) : (
              <span className="notranslate" translate="no">
                {brandName}
              </span>
            )}
          </Link>

          {restaurants.length > 1 && (
            <nav className="hidden items-center gap-0.5 md:flex" aria-label="Locations">
              {restaurants.map((r) => (
                <Link
                  key={r.id}
                  href={locationPath(r)}
                  onClick={() => setActiveRestaurantId(r.id)}
                  className={locationLink(activeRestaurantId === r.id || pathname?.startsWith(`/${r.slug}`))}
                >
                  {r.shortLabel || r.label}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          <nav className="hidden items-center gap-1 lg:flex">
            <Link href="/" className={navLink}>
              Home
            </Link>
            <Link href="/#locations" className={navLink}>
              Locations
            </Link>
          </nav>

          <Link href={activeMenuHref} className={`hidden sm:inline-flex ${ctaSecondary}`}>
            Menu
          </Link>
          <Link href="/book" className={`hidden sm:inline-flex ${ctaPrimary}`}>
            Reserve
          </Link>

          {siteChrome && (
            <SocialRow className="ml-1 hidden text-[color:var(--site-header-fg)] xl:flex" socialLinks={socialLinks} />
          )}

          <button type="button" onClick={() => setCartOpen(true)} className={cartBtn} aria-label="Open cart">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-wood-950">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </button>

          {!loading && isAuthenticated ? (
            <div className="relative hidden md:block" ref={accountMenuRef}>
              <button
                type="button"
                onClick={() => setAccountMenuOpen((prev) => !prev)}
                className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 py-1.5 text-sm font-semibold text-[color:var(--site-header-fg)] hover:bg-white/10"
              >
                <span className={user?.name ? "notranslate" : undefined} translate={user?.name ? "no" : undefined}>
                  {user?.name ? user.name.split(" ")[0] : "Account"}
                </span>
                <svg className={`h-3.5 w-3.5 transition-transform ${accountMenuOpen ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.167l3.71-3.936a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </button>
              {accountMenuOpen && (
                <div className={accountDrop}>
                  <Link href="/profile" onClick={() => setAccountMenuOpen(false)} className={accountItem}>
                    Profile
                  </Link>
                  <Link href="/reservations" onClick={() => setAccountMenuOpen(false)} className={accountItem}>
                    My Reservations
                  </Link>
                  <Link href="/orders" onClick={() => setAccountMenuOpen(false)} className={accountItem}>
                    My Orders
                  </Link>
                  {isOwner(user) && (
                    <Link href={ownerPrimaryDashboardHref()} onClick={() => setAccountMenuOpen(false)} className={`${accountItem} text-accent`}>
                      Owner Dashboard
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      logout();
                    }}
                    className={`${accountItem} w-full text-left`}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : !loading ? (
            <Link href="/login" className={`hidden md:inline-flex ${ctaSecondary}`}>
              Login
            </Link>
          ) : null}

          <button
            className="rounded-md p-2 text-[color:var(--site-header-fg)] hover:bg-white/10 md:hidden"
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div
          className="border-t md:hidden"
          style={{
            borderColor: "var(--site-header-border)",
            backgroundColor: "var(--site-header-bg-solid)",
            color: "var(--site-header-fg)",
          }}
        >
          <nav className="flex max-h-[min(70vh,32rem)] flex-col gap-1 overflow-y-auto px-4 py-4">
            {restaurants.length > 1 && (
              <div className="mb-3">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--site-header-muted)]">
                  Locations
                </p>
                <div className="flex flex-col gap-0.5">
                  {restaurants.map((r) => (
                    <Link
                      key={r.id}
                      href={locationPath(r)}
                      onClick={() => {
                        setActiveRestaurantId(r.id);
                        closeMenu();
                      }}
                      className={`rounded-md px-3 py-2.5 text-left text-base font-medium transition-colors ${
                        activeRestaurantId === r.id || pathname?.startsWith(`/${r.slug}`)
                          ? "bg-white/15 text-[color:var(--site-header-fg)]"
                          : "text-[color:var(--site-header-muted)] hover:bg-white/10"
                      }`}
                    >
                      {r.label}
                      {r.address ? <span className="mt-0.5 block text-xs opacity-70">{r.address}</span> : null}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[color:var(--site-header-muted)]">
              Navigate
            </p>
            <Link href="/" className="rounded-md px-3 py-2.5 text-base font-medium" onClick={closeMenu}>
              Home
            </Link>
            <Link href="/#locations" className="rounded-md px-3 py-2.5 text-base font-medium" onClick={closeMenu}>
              Locations
            </Link>
            <Link href={activeLocationHref} className="rounded-md px-3 py-2.5 text-base font-medium" onClick={closeMenu}>
              This location
            </Link>
            <Link href={activeMenuHref} className="rounded-md px-3 py-2.5 text-base font-medium" onClick={closeMenu}>
              Menu
            </Link>
            <Link href="/book" className="rounded-md px-3 py-2.5 text-base font-medium" onClick={closeMenu}>
              Reserve
            </Link>

            <div className="mt-3 flex gap-2 border-t border-[color:var(--site-header-border)] pt-3">
              <Link href={activeMenuHref} className={`flex-1 justify-center ${ctaSecondary}`} onClick={closeMenu}>
                Menu
              </Link>
              <Link href="/book" className={`flex-1 justify-center ${ctaPrimary}`} onClick={closeMenu}>
                Reserve
              </Link>
            </div>

            <button
              type="button"
              onClick={() => {
                setCartOpen(true);
                closeMenu();
              }}
              className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-base font-medium"
            >
              Cart {totalItems > 0 && `(${totalItems})`}
            </button>

            <div className="mt-2 border-t border-[color:var(--site-header-border)] pt-3">
              {loading ? (
                <span className="px-3 text-sm text-[color:var(--site-header-muted)]">…</span>
              ) : isAuthenticated ? (
                <div className="flex flex-col gap-0.5">
                  {isOwner(user) && (
                    <Link href={ownerPrimaryDashboardHref()} className="rounded-md px-3 py-2.5 text-base font-medium text-accent" onClick={closeMenu}>
                      Owner Dashboard
                    </Link>
                  )}
                  <Link href="/reservations" className="rounded-md px-3 py-2.5 text-base font-medium" onClick={closeMenu}>
                    My Reservations
                  </Link>
                  <Link href="/orders" className="rounded-md px-3 py-2.5 text-base font-medium" onClick={closeMenu}>
                    My Orders
                  </Link>
                  <Link href="/profile" className="rounded-md px-3 py-2.5 text-base font-medium" onClick={closeMenu}>
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className="rounded-md px-3 py-2.5 text-left text-base font-medium"
                  >
                    Logout
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <Link href="/login" className={`justify-center ${ctaSecondary}`} onClick={closeMenu}>
                    Login
                  </Link>
                  <Link href="/register" className={`justify-center ${ctaPrimary}`} onClick={closeMenu}>
                    Sign up
                  </Link>
                </div>
              )}
            </div>

            {siteChrome && (
              <div className="mt-3 flex gap-4 border-t border-[color:var(--site-header-border)] pt-3 text-[color:var(--site-header-fg)]">
                <SocialRow socialLinks={socialLinks} />
              </div>
            )}
          </nav>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
