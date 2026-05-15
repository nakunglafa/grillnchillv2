"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isOwner } from "@/lib/owner-utils";
import {
  rememberLastOwnerPath,
  getLastOwnerPath,
  isLikelyInstalledPwa,
  OWNER_RESUME_SESSION_KEY,
} from "@/lib/pwa-last-owner-path";

/**
 * While using the owner dashboard in an installed PWA, remembers the route.
 * On the next cold open from the app icon (session start), if the user lands on `/` and is still an owner,
 * sends them back to the last owner route instead of the public homepage.
 */
export function PwaOwnerLaunchResume() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated || !user || !isOwner(user)) return;
    if (!pathname || !pathname.startsWith("/owner")) return;
    rememberLastOwnerPath(pathname);
  }, [loading, isAuthenticated, user, pathname]);

  useEffect(() => {
    if (loading) return;
    if (!isLikelyInstalledPwa()) return;
    if (!isAuthenticated || !user || !isOwner(user)) return;
    if (pathname !== "/") return;

    try {
      if (typeof sessionStorage !== "undefined" && sessionStorage.getItem(OWNER_RESUME_SESSION_KEY)) {
        return;
      }
    } catch {
      /* ignore */
    }

    const last = getLastOwnerPath();
    if (!last || last === pathname) return;

    try {
      sessionStorage.setItem(OWNER_RESUME_SESSION_KEY, "1");
    } catch {
      /* ignore */
    }
    router.replace(last);
  }, [loading, isAuthenticated, user, pathname, router]);

  return null;
}
