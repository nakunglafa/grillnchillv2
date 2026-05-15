"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  isOwnerDeviceNotificationSupported,
  getOwnerDeviceNotificationPref,
  enableOwnerBrowserNotifications,
  disableOwnerDeviceNotifications,
} from "@/lib/owner-device-notifications";

const labelClass = "text-sm font-medium text-owner-charcoal";
const descClass = "text-xs leading-snug text-owner-muted";

export function DeviceNotificationSettings() {
  const { token, isAuthenticated } = useAuth();
  const [supported, setSupported] = useState(false);
  const [prefEnabled, setPrefEnabled] = useState(false);
  const [permission, setPermission] = useState("default");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const sync = useCallback(() => {
    if (typeof window === "undefined") return;
    setSupported(isOwnerDeviceNotificationSupported());
    setPrefEnabled(getOwnerDeviceNotificationPref().enabled);
    setPermission("Notification" in window ? Notification.permission : "denied");
  }, []);

  useEffect(() => {
    sync();
  }, [sync]);

  if (!isAuthenticated || !token) return null;

  if (!supported) {
    return (
      <div className="mt-4 rounded-lg border border-owner-border/70 bg-owner-paper/50 px-3 py-3">
        <p className={labelClass}>Phone &amp; system notifications</p>
        <p className={`${descClass} mt-1`}>
          Your browser does not support notifications here. Try Chrome or Safari on your phone.
        </p>
      </div>
    );
  }

  const onEnable = async () => {
    setMessage("");
    setBusy(true);
    try {
      const result = await enableOwnerBrowserNotifications({ token });
      setPermission(result.permission);
      setPrefEnabled(getOwnerDeviceNotificationPref().enabled);
      if (result.error && result.ok) setMessage(result.error);
      else if (result.error) setMessage(result.error);
      else setMessage("Notifications enabled for this device.");
    } finally {
      setBusy(false);
    }
    sync();
  };

  const onTogglePref = async (checked) => {
    if (checked) {
      if (permission !== "granted") {
        await onEnable();
        return;
      }
      setBusy(true);
      setMessage("");
      try {
        await enableOwnerBrowserNotifications({ token });
        setPrefEnabled(true);
        setMessage("Alerts on for this device.");
      } finally {
        setBusy(false);
      }
      sync();
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await disableOwnerDeviceNotifications(token);
      setPrefEnabled(false);
      setMessage("Alerts off for this device.");
    } finally {
      setBusy(false);
    }
    sync();
  };

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-owner-border/70 bg-owner-paper/50 px-3 py-3">
      <div>
        <p className={labelClass}>Phone &amp; system notifications</p>
        <p className={`${descClass} mt-1`}>
          Get the same new order and reservation alerts in your phone&apos;s notification shade when the dashboard is open or in
          the background. For alerts when the browser is fully closed, the server must send Web Push (optional setup).
        </p>
      </div>

      <p className={`${descClass} text-[11px] md:text-xs`}>
        <strong className="font-medium text-owner-charcoal">Install as an app (PWA):</strong> use your browser&apos;s &quot;Install&quot; or &quot;Add to Home
        Screen&quot; so the site opens full-screen and stays easier to keep open for live service.{" "}
        <strong className="font-medium text-owner-charcoal">iPhone:</strong> Share → Add to Home Screen works best for background
        alerts. <strong className="font-medium text-owner-charcoal">Android:</strong> allow notifications for this app/site in system
        settings.
      </p>

      {permission === "denied" && (
        <p className="rounded-md bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-800 dark:text-amber-200">
          The browser is blocking notifications. Open site settings for this page and allow notifications, then try again.
        </p>
      )}

      {(permission === "default" || permission === "denied") && (
        <button
          type="button"
          disabled={busy || permission === "denied"}
          onClick={onEnable}
          className="touch-manipulation rounded-lg bg-owner-action px-4 py-2.5 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "Working…" : "Allow notifications on this device"}
        </button>
      )}

      {permission === "granted" && (
        <label className="flex cursor-pointer items-start gap-3 pt-0.5">
          <input
            type="checkbox"
            checked={prefEnabled}
            disabled={busy}
            onChange={(e) => onTogglePref(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 rounded border-owner-border text-owner-action focus:ring-owner-action"
          />
          <span className="text-sm font-medium text-owner-charcoal">
            Send new order &amp; reservation alerts to this device
          </span>
        </label>
      )}

      {permission === "granted" && !prefEnabled && (
        <button
          type="button"
          disabled={busy}
          onClick={onEnable}
          className="text-xs font-medium text-owner-action underline hover:no-underline"
        >
          Turn alerts back on
        </button>
      )}

      {permission === "granted" && prefEnabled && process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY && (
        <p className={descClass}>
          Web Push is configured: this device can receive alerts when the dashboard is closed, once the server sends pushes for
          new orders and reservations.
        </p>
      )}

      {message && <p className="text-xs text-owner-muted">{message}</p>}
    </div>
  );
}
