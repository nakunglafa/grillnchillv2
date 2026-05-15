/**
 * Owner dashboard: browser / phone notifications for new orders & reservations.
 *
 * - While a tab is open: uses the Push API's registration.showNotification (needs a service worker).
 * - When the tab is closed: requires Web Push from the Laravel API (store subscription via registerPushSubscription).
 *
 * Set NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY (VAPID public key from backend) to register push subscriptions.
 * Backend must implement POST/DELETE /push-subscriptions (or change paths in api.js).
 */

import { registerPushSubscription, removePushSubscription } from "@/lib/api";
import { PWA_SERVICE_WORKER_URL } from "@/lib/pwa-constants";

const PREF_KEY = "owner:device-notifications:enabled";
const ENDPOINT_KEY = "owner:device-notifications:push-endpoint";

/** @returns {{ enabled: boolean }} */
export function getOwnerDeviceNotificationPref() {
  if (typeof window === "undefined") return { enabled: false };
  try {
    return { enabled: localStorage.getItem(PREF_KEY) === "1" };
  } catch {
    return { enabled: false };
  }
}

/** @param {boolean} enabled */
export function setOwnerDeviceNotificationPref(enabled) {
  if (typeof window === "undefined") return;
  try {
    if (enabled) localStorage.setItem(PREF_KEY, "1");
    else localStorage.removeItem(PREF_KEY);
  } catch {
    /* ignore */
  }
}

export function isOwnerDeviceNotificationSupported() {
  if (typeof window === "undefined") return false;
  return Boolean("serviceWorker" in navigator && "Notification" in window && "PushManager" in window);
}

function getVapidPublicKey() {
  const k = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY;
  return typeof k === "string" && k.trim() ? k.trim() : "";
}

/** @param {string} base64String */
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

/** @returns {Promise<ServiceWorkerRegistration>} */
export async function registerOwnerPushServiceWorker() {
  return navigator.serviceWorker.register(PWA_SERVICE_WORKER_URL, { scope: "/" });
}

function rememberPushEndpoint(endpoint) {
  try {
    if (endpoint) localStorage.setItem(ENDPOINT_KEY, endpoint);
    else localStorage.removeItem(ENDPOINT_KEY);
  } catch {
    /* ignore */
  }
}

function getStoredPushEndpoint() {
  try {
    return localStorage.getItem(ENDPOINT_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Request permission, register SW, optionally subscribe to Web Push and POST to API.
 * @param {{ token: string }} opts
 * @returns {Promise<{ ok: boolean; permission: NotificationPermission; error?: string }>}
 */
export async function enableOwnerBrowserNotifications({ token }) {
  if (typeof window === "undefined") {
    return { ok: false, permission: "denied", error: "Not in browser" };
  }
  if (!isOwnerDeviceNotificationSupported()) {
    return { ok: false, permission: "denied", error: "Notifications are not supported in this browser" };
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }
  if (permission !== "granted") {
    return { ok: false, permission, error: permission === "denied" ? "Blocked in browser settings" : "Permission not granted" };
  }

  try {
    const reg = await registerOwnerPushServiceWorker();
    await reg.update().catch(() => {});

    const vapid = getVapidPublicKey();
    if (vapid && reg.pushManager) {
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        });
      }
      if (sub?.endpoint) {
        try {
          await registerPushSubscription(token, sub.toJSON ? sub.toJSON() : sub);
          rememberPushEndpoint(sub.endpoint);
        } catch (e) {
          const msg = e?.message || "Could not save push subscription on server";
          setOwnerDeviceNotificationPref(true);
          return { ok: true, permission: "granted", error: `${msg} (on-device alerts still work when the dashboard is open)` };
        }
      }
    }

    setOwnerDeviceNotificationPref(true);
    return { ok: true, permission: "granted" };
  } catch (e) {
    const message = e?.message || "Could not enable notifications";
    return { ok: false, permission: Notification.permission, error: message };
  }
}

/**
 * Turn off stored preference and remove push subscription from device + API when possible.
 * @param {string} token
 */
export async function disableOwnerDeviceNotifications(token) {
  setOwnerDeviceNotificationPref(false);
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  const endpoint = getStoredPushEndpoint();
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.pushManager) {
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        if (token && endpoint) {
          try {
            await removePushSubscription(token, sub.endpoint);
          } catch {
            /* still unsubscribe locally */
          }
        }
        await sub.unsubscribe().catch(() => {});
      }
    }
  } catch {
    /* ignore */
  }
  rememberPushEndpoint("");
}

/**
 * Show a system notification (tab can be in background on many browsers).
 * Respects getOwnerDeviceNotificationPref() and Notification.permission.
 *
 * @param {{ title: string; body: string; tag: string; url?: string }} opts
 */
export async function tryShowOwnerDeviceNotification({ title, body, tag, url }) {
  if (typeof window === "undefined") return;
  if (!getOwnerDeviceNotificationPref().enabled) return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const path = url && url.startsWith("/") ? url : "/owner";
  const openUrl = `${window.location.origin}${path}`;

  try {
    const reg =
      (await navigator.serviceWorker.getRegistration()) || (await navigator.serviceWorker.ready.catch(() => null));
    if (reg?.showNotification) {
      await reg.showNotification(title, {
        body,
        tag: `owner-${tag}`,
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        data: { url: path },
      });
      return;
    }
  } catch {
    /* fall through */
  }

  try {
    new Notification(title, { body, tag: `owner-${tag}`, data: openUrl });
  } catch {
    /* ignore */
  }
}
