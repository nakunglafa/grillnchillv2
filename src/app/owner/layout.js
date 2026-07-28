"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { AuthProvider } from "@/context/AuthContext";
import { isOwner } from "@/lib/owner-utils";
import { OwnerRefreshProvider } from "@/context/OwnerRefreshContext";
import { ownerPrimaryDashboardHref } from "@/lib/owner-dashboard-path";
import { EVENTS } from "@/context/RealTimeNotificationContext";

function OwnerLayoutInner({ children }) {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(ownerPrimaryDashboardHref())}`);
      return;
    }
    if (!isOwner(user)) {
      router.replace("/");
    }
  }, [user, isAuthenticated, loading, router]);

  useEffect(() => {
    if (typeof window === "undefined" || !isOwner(user)) return;

    const handleNewReservation = () => {};
    const handleReservationUpdated = () => {};
    const handleNewOrder = () => {};

    window.addEventListener(EVENTS.NEW_RESERVATION, handleNewReservation);
    window.addEventListener(EVENTS.RESERVATION_UPDATED, handleReservationUpdated);
    window.addEventListener(EVENTS.NEW_ORDER, handleNewOrder);

    return () => {
      window.removeEventListener(EVENTS.NEW_RESERVATION, handleNewReservation);
      window.removeEventListener(EVENTS.RESERVATION_UPDATED, handleReservationUpdated);
      window.removeEventListener(EVENTS.NEW_ORDER, handleNewOrder);
    };
  }, [user]);

  if (loading) {
    return (
      <div className="owner-theme notranslate flex min-h-screen items-center justify-center" translate="no">
        <p className="text-owner-charcoal">Loading owner dashboard…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="owner-theme notranslate flex min-h-screen flex-col items-center justify-center gap-2 px-4" translate="no">
        <p className="text-owner-charcoal">Redirecting to login…</p>
        <p className="text-sm text-owner-muted">Owner access requires an owner account.</p>
      </div>
    );
  }

  if (!isOwner(user)) {
    return (
      <div className="owner-theme notranslate flex min-h-screen flex-col items-center justify-center gap-2 px-4" translate="no">
        <p className="text-owner-charcoal">Redirecting…</p>
        <p className="text-sm text-owner-muted">This account does not have owner access.</p>
      </div>
    );
  }

  return (
    <OwnerRefreshProvider>
      {/* `notranslate` keeps Google Translate from rewriting any dashboard
          content. Even though we don't init Google Translate on /owner/*
          routes, a tab arriving here from a translated customer page can
          still have the widget active. This ensures the dashboard always
          stays in English. */}
      <div className="owner-theme notranslate min-h-screen" translate="no">
        <header
          className="sticky top-0 z-40 border-b border-owner-walnut/20 bg-owner-walnut"
          style={{ height: "var(--owner-header-height)" }}
        >
          <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-3 px-3 sm:px-4">
            <Link
              href={ownerPrimaryDashboardHref()}
              className="touch-manipulation inline-flex h-8 items-center gap-1.5 text-sm font-semibold text-owner-nav"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-owner-nav">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              Owner Dashboard
            </Link>
            <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className="touch-manipulation hidden h-8 items-center rounded-md px-2.5 text-xs font-medium text-owner-nav hover:bg-white/10 transition-colors sm:inline-flex"
            >
                Back to site
              </Link>

              {/* User Dropdown */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                  className="flex h-8 items-center gap-1.5 rounded-full border border-owner-nav/30 bg-owner-walnut p-0.5 pr-2 text-xs font-medium text-owner-nav shadow-sm hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-owner-action focus:ring-offset-1 focus:ring-offset-owner-walnut transition-colors"
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                >
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-owner-success/90 text-xs font-bold text-owner-nav">
                    {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase() || 'O'}
                  </div>
                  <span className="hidden sm:block max-w-[100px] truncate">{user?.name || user?.email}</span>
                  <svg className="h-3.5 w-3.5 text-owner-nav" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>

                {isDropdownOpen && (
                  <div className="absolute right-0 mt-1.5 w-52 origin-top-right rounded-md bg-owner-card shadow-owner-card ring-1 ring-owner-border z-50">
                    <div className="px-3 py-2 border-b border-owner-border">
                      <p className="text-xs text-owner-muted">Signed in as</p>
                      <p className="truncate text-xs font-medium text-owner-charcoal">{user?.email}</p>
                      {user?.name && <p className="truncate text-[11px] text-owner-muted mt-0.5">{user.name}</p>}
                    </div>
                    <div className="py-1">
                      <Link
                        href="/"
                        className="block sm:hidden px-3 py-1.5 text-xs text-owner-charcoal hover:bg-owner-paper"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Back to site
                      </Link>
                      <button
                        onClick={() => {
                          setIsDropdownOpen(false);
                          logout();
                        }}
                        className="block w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 hover:text-red-700 transition-colors"
                      >
                        Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>
        <main>{children}</main>
      </div>
    </OwnerRefreshProvider>
  );
}

export default function OwnerLayout({ children }) {
  return (
    <AuthProvider>
      <OwnerLayoutInner>{children}</OwnerLayoutInner>
    </AuthProvider>
  );
}
