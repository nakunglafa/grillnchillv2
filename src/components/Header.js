"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { getRestaurant } from "@/lib/api";
import { isOwner } from "@/lib/owner-utils";
import { CartDrawer } from "@/components/CartDrawer";

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || "9";

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
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-90 transition-opacity hover:opacity-100"
          aria-label="Facebook"
        >
          <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
        </a>
      )}
      {instagramUrl && (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-90 transition-opacity hover:opacity-100"
          aria-label="Instagram"
        >
          <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        </a>
      )}
      {xUrl && (
        <a
          href={xUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-90 transition-opacity hover:opacity-100"
          aria-label="X"
        >
          <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
        </a>
      )}
      {tiktokUrl && (
        <a
          href={tiktokUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-90 transition-opacity hover:opacity-100"
          aria-label="TikTok"
        >
          <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M16.6 5.82a4.77 4.77 0 0 0 2.8.9V9.5a7.56 7.56 0 0 1-2.8-.52v5.17c0 2.97-2.41 5.38-5.38 5.38s-5.38-2.41-5.38-5.38 2.41-5.38 5.38-5.38c.26 0 .52.02.77.06v2.83a2.56 2.56 0 0 0-.77-.12 2.61 2.61 0 1 0 2.61 2.61V2.5h2.77v.18c0 1.2.48 2.35 1.33 3.14z" />
          </svg>
        </a>
      )}
      {googleMapsUrl && (
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-90 transition-opacity hover:opacity-100"
          aria-label="Google Maps"
        >
          <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 2a7 7 0 0 0-7 7c0 5.25 7 13 7 13s7-7.75 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6a2.5 2.5 0 0 1 0 5.5z" />
          </svg>
        </a>
      )}
      {tripadvisorUrl && (
        <a
          href={tripadvisorUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="opacity-90 transition-opacity hover:opacity-100"
          aria-label="TripAdvisor"
        >
          <svg className={icon} fill="none" viewBox="0 0 24 24" aria-hidden>
            <path
              d="M4 8.5c1.3-.9 3-1.5 5-1.7L12 4l3 2.8c2 .2 3.7.8 5 1.7M7.2 15.1l2.3 2.2c1.4 1.3 3.7 1.3 5.1 0l2.3-2.2"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
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
 * `marketing` — same client nav as `overlay` (Home, About, Menus, Book) but sticky; use on /menu etc.
 */
export function Header({ variant = "default" }) {
  const { user, isAuthenticated, logout, loading } = useAuth();
  const { totalItems, hydrate } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef(null);

  useEffect(() => {
    hydrate();
  }, [hydrate]);
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [socialLinks, setSocialLinks] = useState(null);
  const [resLoading, setResLoading] = useState(true);

  useEffect(() => {
    getRestaurant(RESTAURANT_ID)
      .then((data) => {
        if (data?.restaurant?.name) {
          setRestaurantName(data.restaurant.name);
        }
        if (data?.restaurant?.social_links && typeof data.restaurant.social_links === "object") {
          setSocialLinks(data.restaurant.social_links);
        } else {
          setSocialLinks(null);
        }
      })
      .catch(() => {})
      .finally(() => setResLoading(false));
  }, []);

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

  const toggleMenu = () => setMenuOpen(!menuOpen);
  const closeMenu = () => setMenuOpen(false);

  const overlay = variant === "overlay";
  const marketing = variant === "marketing";
  const siteChrome = overlay || marketing;

  const navLink = siteChrome
    ? "px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/90 hover:text-accent transition-colors"
    : "px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-wood-600 hover:text-accent transition-colors";

  const cartBtn = siteChrome
    ? "relative rounded-lg p-2 text-white/90 hover:bg-white/10 hover:text-accent transition-colors"
    : "relative rounded-lg p-2 text-wood-600 hover:bg-white/10 hover:text-accent transition-colors";

  const headerBarClass = marketing
    ? "sticky top-0 z-50 border-b border-white/10 bg-[#0a0908]/90 backdrop-blur-md"
    : overlay
      ? "sticky top-0 z-50 border-b border-white/10 bg-black/35 backdrop-blur-md"
      : "sticky top-0 z-30 border-b border-accent/20 bg-wood-50/90 backdrop-blur-xl";

  return (
    <header className={headerBarClass}>
      <div
        className={`relative mx-auto flex max-w-7xl items-center justify-between px-3 sm:px-5 ${
          siteChrome ? "h-16 sm:h-17" : "h-17"
        }`}
      >
        <Link
          href="/"
          className={
            siteChrome
              ? "shrink-0 font-sans text-sm font-bold uppercase tracking-[0.28em] text-white sm:text-base"
              : "shrink-0 font-display text-xl font-semibold tracking-tight text-wood-900 sm:text-2xl"
          }
          onClick={closeMenu}
        >
          {resLoading ? (
            <div
              className={`h-5 w-24 animate-pulse rounded-md ${siteChrome ? "bg-white/20" : "bg-wood-400/50"}`}
            />
          ) : (
            <span className="notranslate" translate="no">{restaurantName}</span>
          )}
        </Link>

        {siteChrome && (
          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-2 lg:flex xl:gap-6">
            <Link href="/" className={navLink}>
              Home
            </Link>
            <Link href="/#our-story" className={navLink}>
              About us
            </Link>
            <Link href="/menu" className={navLink}>
              Menus
            </Link>
            <Link href="/book" className={navLink}>
              Book
            </Link>
          </nav>
        )}

        <div className="flex items-center gap-1 sm:gap-2">
          {siteChrome && <SocialRow className="mr-1 hidden text-white md:flex" socialLinks={socialLinks} />}
          <button type="button" onClick={() => setCartOpen(true)} className={cartBtn} aria-label="Open cart">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
            {totalItems > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-wood-950">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            )}
          </button>

          {!siteChrome && (
            <nav className="hidden items-center gap-1 md:flex lg:gap-2">
              <Link href="/menu" className={navLink}>
                Menu
              </Link>
              <Link href="/book" className={navLink}>
                Book a Table
              </Link>
              {loading ? (
                <span className="text-sm text-wood-600">...</span>
              ) : isAuthenticated ? (
                <div className="relative" ref={accountMenuRef}>
                  <button
                    type="button"
                    onClick={() => setAccountMenuOpen((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-wood-700 hover:bg-white/10 hover:text-accent transition-colors"
                  >
                    <span
                      className={user?.name ? "notranslate" : undefined}
                      translate={user?.name ? "no" : undefined}
                    >
                      {user?.name || "Account"}
                    </span>
                    <svg
                      className={`h-3.5 w-3.5 transition-transform ${accountMenuOpen ? "rotate-180" : ""}`}
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
                  {accountMenuOpen && (
                    <div className="absolute right-0 top-full z-50 mt-1.5 w-56 rounded-lg border border-white/20 bg-wood-50 p-1.5 shadow-xl">
                      <Link
                        href="/profile"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-wood-700 hover:bg-white/80 hover:text-accent"
                      >
                        Profile
                      </Link>
                      <Link
                        href="/reservations"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-wood-700 hover:bg-white/80 hover:text-accent"
                      >
                        My Reservations
                      </Link>
                      <Link
                        href="/orders"
                        onClick={() => setAccountMenuOpen(false)}
                        className="block rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-wood-700 hover:bg-white/80 hover:text-accent"
                      >
                        My Orders
                      </Link>
                      {isOwner(user) && (
                        <Link
                          href="/owner/dashboard"
                          onClick={() => setAccountMenuOpen(false)}
                          className="block rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-accent hover:bg-white/80 hover:text-accent-hover"
                        >
                          Owner Dashboard
                        </Link>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAccountMenuOpen(false);
                          logout();
                        }}
                        className="mt-1 block w-full rounded-md px-3 py-2 text-left text-xs font-semibold uppercase tracking-[0.12em] text-wood-700 hover:bg-white/80 hover:text-accent"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-wood-600 hover:text-accent transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="rounded-sm bg-accent px-4 py-2.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-wood-950 hover:bg-accent-hover transition-colors shadow-md"
                  >
                    Sign up
                  </Link>
                </>
              )}
            </nav>
          )}

          {siteChrome && !loading && isAuthenticated && (
            <>
              <Link
                href="/orders"
                className="hidden rounded-sm px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90 hover:text-accent xl:inline"
              >
                Orders
              </Link>
              <Link
                href="/profile"
                className="hidden rounded-sm px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-white/90 hover:text-accent xl:inline"
              >
                <span
                  className={user?.name ? "notranslate" : undefined}
                  translate={user?.name ? "no" : undefined}
                >
                  {user?.name ? user.name.split(" ")[0] : "Account"}
                </span>
              </Link>
            </>
          )}
          {siteChrome && !loading && !isAuthenticated && (
            <Link
              href="/login"
              className="hidden rounded-sm border border-white/25 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-white/95 hover:bg-white/10 sm:inline-flex"
            >
              Login
            </Link>
          )}

          <button
            className={`p-2 rounded-lg transition-colors md:hidden ${
              siteChrome ? "text-white hover:bg-white/10" : "text-wood-600 hover:text-wood-900 hover:bg-white/10"
            }`}
            onClick={toggleMenu}
            aria-label="Toggle menu"
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
          className={`border-t px-4 py-4 md:hidden ${
            siteChrome ? "border-white/10 bg-[#0a0908]/95 backdrop-blur-xl" : "border-white/10 bg-wood-200/95 backdrop-blur-xl"
          }`}
        >
          <nav className="flex flex-col gap-4">
            {siteChrome && (
              <>
                <Link href="/" className="text-base font-medium text-white" onClick={closeMenu}>
                  Home
                </Link>
                <Link href="/#our-story" className="text-base font-medium text-white" onClick={closeMenu}>
                  About us
                </Link>
                <Link href="/menu" className="text-base font-medium text-white" onClick={closeMenu}>
                  Menus
                </Link>
                <Link href="/book" className="text-base font-medium text-white" onClick={closeMenu}>
                  Book
                </Link>
                <div className="flex gap-4 border-t border-white/10 pt-4 text-white">
                  <SocialRow socialLinks={socialLinks} />
                </div>
              </>
            )}
            <button
              type="button"
              onClick={() => {
                setCartOpen(true);
                closeMenu();
              }}
              className={`flex w-full items-center gap-2 text-base font-medium ${siteChrome ? "text-white" : "text-wood-900"}`}
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              Cart {totalItems > 0 && `(${totalItems})`}
            </button>
            {!siteChrome && (
              <>
                <Link href="/menu" className="text-base font-medium text-wood-900" onClick={closeMenu}>
                  Menu
                </Link>
                <Link href="/book" className="text-base font-medium text-wood-900" onClick={closeMenu}>
                  Book a Table
                </Link>
              </>
            )}
            {loading ? (
              <span className={`text-base ${siteChrome ? "text-white/70" : "text-wood-600"}`}>...</span>
            ) : isAuthenticated ? (
              siteChrome ? (
                <>
                  <Link
                    href="/orders"
                    className="text-base font-medium text-white/90"
                    onClick={closeMenu}
                  >
                    Orders
                  </Link>
                  <Link
                    href="/profile"
                    className="text-base font-medium text-white/90"
                    onClick={closeMenu}
                  >
                    <span
                      className={user?.name ? "notranslate" : undefined}
                      translate={user?.name ? "no" : undefined}
                    >
                      {user?.name ? user.name.split(" ")[0] : "Account"}
                    </span>
                  </Link>
                </>
              ) : (
                <>
                  {isOwner(user) && (
                    <Link
                      href="/owner/dashboard"
                      className="text-base font-medium text-accent"
                      onClick={closeMenu}
                    >
                      Owner Dashboard
                    </Link>
                  )}
                  <Link
                    href="/reservations"
                    className="text-base font-medium text-wood-600"
                    onClick={closeMenu}
                  >
                    My Reservations
                  </Link>
                  <Link href="/orders" className="text-base font-medium text-wood-600" onClick={closeMenu}>
                    My Orders
                  </Link>
                  <Link
                    href="/profile"
                    className="text-base font-medium text-wood-600"
                    onClick={closeMenu}
                  >
                    <span
                      className={user?.name ? "notranslate" : undefined}
                      translate={user?.name ? "no" : undefined}
                    >
                      {user?.name || "Profile"}
                    </span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      closeMenu();
                    }}
                    className="w-full text-left text-base font-medium text-wood-600"
                  >
                    Logout
                  </button>
                </>
              )
            ) : (
              !siteChrome && (
                <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
                  <Link href="/login" className="text-base font-medium text-wood-900" onClick={closeMenu}>
                    Login
                  </Link>
                  <Link href="/register" className="text-base font-medium text-wood-900" onClick={closeMenu}>
                    Sign up
                  </Link>
                </div>
              )
            )}
            {siteChrome && !isAuthenticated && (
              <div className="flex flex-col gap-2 border-t border-white/10 pt-2">
                <Link href="/login" className="text-base font-medium text-white" onClick={closeMenu}>
                  Login
                </Link>
                <Link href="/register" className="text-base font-medium text-white" onClick={closeMenu}>
                  Sign up
                </Link>
              </div>
            )}
          </nav>
        </div>
      )}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </header>
  );
}
