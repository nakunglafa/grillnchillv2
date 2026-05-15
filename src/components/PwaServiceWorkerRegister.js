"use client";

import { useEffect } from "react";
import { PWA_SERVICE_WORKER_URL } from "@/lib/pwa-constants";

/**
 * Registers the app service worker on every page so the site is installable (PWA)
 * and owner notifications can use the same registration without a separate prompt.
 */
export function PwaServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("nosw")) return;

    navigator.serviceWorker.register(PWA_SERVICE_WORKER_URL, { scope: "/" }).catch(() => {});
  }, []);

  return null;
}
