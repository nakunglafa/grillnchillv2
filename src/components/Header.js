"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import { getRestaurant } from "@/lib/api";
import { isOwner } from "@/lib/owner-utils";
import { CartDrawer } from "@/components/CartDrawer";

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || "9";

function SocialRow({ className }) {
  const icon = "h-4 w-4";
  return (
    <div className={`flex items-center gap-3 ${className ?? ""}`}>
      <a
        href="https://facebook.com"
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-90 transition-opacity hover:opacity-100"
        aria-label="Facebook"
      >
        <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>
      <a
        href="https://instagram.com"
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-90 transition-opacity hover:opacity-100"
        aria-label="Instagram"
      >
        <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
        </svg>
      </a>
      <a
        href="https://twitter.com"
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-90 transition-opacity hover:opacity-100"
        aria-label="X"
      >
        <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      <a
        href="https://www.tripadvisor.com"
        target="_blank"
        rel="noopener noreferrer"
        className="opacity-90 transition-opacity hover:opacity-100"
        aria-label="TripAdvisor"
      >
        <svg className={icon} fill="currentColor" viewBox="0 0 24 24" aria-hidden>
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
        </svg>
      </a>
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

  useEffect(() => {
    hydrate();
  }, [hydrate]);
  const [restaurantName, setRestaurantName] = useState("Restaurant");
  const [resLoading, setResLoading] = useState(true);

  useEffect(() => {
    getRestaurant(RESTAURANT_ID)
      .then((data) => {
        if (data?.restaurant?.name) {
          setRestaurantName(data.restaurant.name);
        }
      })
      .catch(() => {})
      .finally(() => setResLoading(false));
  }, []);

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
      ? "absolute inset-x-0 top-0 z-50 border-b border-white/10 bg-black/20 backdrop-blur-md"
      : "sticky top-0 z-30 border-b border-accent/20 bg-wood-50/90 backdrop-blur-xl";

  return (
    <header className={headerBarClass}>
      <div
        className={`relative mx-auto flex max-w-7xl items-center justify-between px-4 sm:px-6 ${
          siteChrome ? "h-20" : "h-[4.25rem]"
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
            restaurantName
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
          {siteChrome && <SocialRow className="mr-1 hidden text-white md:flex" />}
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
                <>
                  {isOwner(user) && (
                    <Link href="/owner/dashboard" className="text-[15px] font-medium text-accent hover:text-accent-hover">
                      Owner Dashboard
                    </Link>
                  )}
                  <Link href="/reservations" className={navLink}>
                    My Reservations
                  </Link>
                  <Link href="/orders" className={navLink}>
                    My Orders
                  </Link>
                  <Link href="/profile" className={navLink}>
                    {user?.name || "Profile"}
                  </Link>
                  <button
                    type="button"
                    onClick={logout}
                    className="rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-wood-600 hover:bg-white/10 hover:text-accent transition-colors"
                  >
                    Logout
                  </button>
                </>
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
                {user?.name ? user.name.split(" ")[0] : "Account"}
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
                  <SocialRow />
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
                    {user?.name ? user.name.split(" ")[0] : "Account"}
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
                    {user?.name || "Profile"}
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
