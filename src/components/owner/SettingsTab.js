"use client";

import { useState, useEffect } from "react";
import {
  getRestaurantById,
  getRestaurantConfig,
  getRestaurantPaymentConfig,
  getOwnerWebsiteContent,
  updateOwnerRestaurant,
  updateOwnerWebsiteContent,
  updateRestaurantConfig,
  updateRestaurantPaymentConfig,
  updateOpeningSlots,
  syncGooglePlaceHours,
} from "@/lib/api";
import { setKeepScreenOnPreference } from "@/hooks/useScreenWakeLock";
import { ImageUploadDropzone } from "@/components/owner/ImageUploadDropzone";
import { DeviceNotificationSettings } from "@/components/owner/DeviceNotificationSettings";
import { PrintPreferencesSettings } from "@/components/owner/PrintPreferencesSettings";
import { FONT_PAIRS, DEFAULT_PUBLIC_THEME, isHexColor, resolvePublicTheme, getFontPair } from "@/lib/site-theme";
import { getEnvGooglePlaceIdForSlug, getRestaurantById as getCatalogRestaurant } from "@/lib/restaurants";

const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function generateTimeOptions() {
  const options = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`);
    }
  }
  return options;
}

function ThemeLivePreview({ themeForm, restaurantName }) {
  const pair = getFontPair(themeForm?.fontPair);
  const background = isHexColor(themeForm?.background) ? themeForm.background : DEFAULT_PUBLIC_THEME.background;
  const foreground = isHexColor(themeForm?.foreground) ? themeForm.foreground : DEFAULT_PUBLIC_THEME.foreground;
  const accent = isHexColor(themeForm?.accent) ? themeForm.accent : DEFAULT_PUBLIC_THEME.accent;
  const heading = String(restaurantName || "Restaurant").trim() || "Restaurant";

  return (
    <div className="rounded-xl border border-owner-border bg-owner-paper p-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-owner-muted">Live preview</p>
      <div
        className="rounded-xl border border-black/5 p-5 shadow-sm"
        style={{ backgroundColor: background, color: foreground }}
      >
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.22em]"
          style={{ fontFamily: pair.body, color: accent }}
        >
          Sample
        </p>
        <h4 className="mt-2 text-2xl font-semibold tracking-tight" style={{ fontFamily: pair.heading, color: foreground }}>
          {heading}
        </h4>
        <p className="mt-2 text-sm leading-relaxed" style={{ fontFamily: pair.body, color: foreground, opacity: 0.78 }}>
          Welcome in — this is how headings, body text, and buttons will look on your public site.
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span
            className="inline-flex h-6 w-6 rounded-full ring-2 ring-black/5"
            style={{ backgroundColor: accent }}
            aria-hidden
          />
          <button
            type="button"
            tabIndex={-1}
            className="inline-flex min-h-[40px] items-center justify-center rounded-full px-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white"
            style={{ backgroundColor: accent, fontFamily: pair.body }}
          >
            Reserve
          </button>
        </div>
      </div>
    </div>
  );
}

export function SettingsTab({ restaurantId, token, restaurant, onRefresh, onRestaurantUpdate, keepScreenOn = false, onKeepScreenOnChange, isBakery = false }) {
  const [config, setConfig] = useState(null);
  const [slotsByDay, setSlotsByDay] = useState(() =>
    DAYS.reduce((acc, d) => ({ ...acc, [d]: [] }), {})
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editRestaurant, setEditRestaurant] = useState({
    name: "",
    address: "",
    phone: "",
    google_business_url: "",
    logo_url: "",
    social_x_url: "",
    social_facebook_url: "",
    social_instagram_url: "",
    social_tiktok_url: "",
    google_maps_url: "",
    tripadvisor_url: "",
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoCacheBust, setLogoCacheBust] = useState(0);
  const [editConfig, setEditConfig] = useState({
    default_reservation_duration: 90,
    max_party_size: 10,
    reservation_start_buffer: 0,
    reservation_end_buffer: 0,
  });
  const [paymentConfig, setPaymentConfig] = useState({
    stripe_enabled: true,
    pickup_enabled: true,
  });
  const [googlePlaceId, setGooglePlaceId] = useState("");
  const [googlePlaceSyncedAt, setGooglePlaceSyncedAt] = useState("");
  const [websiteContentJson, setWebsiteContentJson] = useState({});
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [themeForm, setThemeForm] = useState(() => ({ ...DEFAULT_PUBLIC_THEME }));
  /** Auto-clear success after 5s */
  useEffect(() => {
    if (!success) return;
    const t = setTimeout(() => setSuccess(""), 5000);
    return () => clearTimeout(t);
  }, [success]);

  /** Parse API opening_slots (array, possibly multiple per day) into slotsByDay */
  const apiSlotsToSlotsByDay = (rawSlots) => {
    const arr = Array.isArray(rawSlots) ? rawSlots : [];
    const toHhMmSs = (t) =>
      t && typeof t === "string"
        ? t.length === 5
          ? `${t}:00`
          : t
        : "09:00:00";
    return DAYS.reduce((acc, day) => {
      const daySlots = arr
        .filter((s) => (s.day_of_week || s.day || "").toLowerCase() === day)
        .sort((a, b) =>
          (toHhMmSs(a.open_time) || "").localeCompare(toHhMmSs(b.open_time) || "")
        )
        .map((s) => ({
          open_time: toHhMmSs(s.open_time),
          close_time: toHhMmSs(s.close_time),
        }));
      acc[day] = daySlots.length ? daySlots : [];
      return acc;
    }, {});
  };

  /** Convert slotsByDay back to API slots array. Match admin edit page: send HH:MM:SS. */
  const slotsByDayToApi = (byDay) => {
    const toHhMmSs = (t, fallback) => {
      const s = (t || fallback).length === 5 ? `${t}:00` : t || fallback;
      return s;
    };
    return Object.entries(byDay).flatMap(([day, slots]) =>
      (slots || []).map((slot) => ({
        day_of_week: day,
        open_time: toHhMmSs(slot.open_time, "09:00:00"),
        close_time: toHhMmSs(slot.close_time, "17:00:00"),
      }))
    );
  };

  useEffect(() => {
    if (!restaurantId || !token) return;
    setLoading(true);
    setError("");
    const restPromise = restaurant ? Promise.resolve(restaurant) : getRestaurantById(restaurantId, token);
    const paymentPromise = getRestaurantPaymentConfig(token, restaurantId).catch(() => null);
    const configPromise = getRestaurantConfig(token, restaurantId).catch((err) => {
      if (err?.status === 404) return { data: null, noConfig: true };
      throw err;
    });
    const contentPromise = getOwnerWebsiteContent(token, restaurantId).catch(() => null);

    Promise.all([configPromise, restPromise, paymentPromise, contentPromise])
      .then(([configRes, restRes, paymentRes, contentRes]) => {
        const cfg = configRes?.data ?? configRes;
        const rest = restRes?.data ?? restRes ?? restRes?.restaurant ?? restRes;
        const pay = paymentRes?.data ?? paymentRes;
        const savedContent =
          contentRes?.content_json ??
          contentRes?.data?.content_json ??
          (contentRes?.data && typeof contentRes.data === "object" && !Array.isArray(contentRes.data)
            ? contentRes.data
            : null) ??
          (contentRes && typeof contentRes === "object" && (contentRes.google_place_id || contentRes.googlePlaceId)
            ? contentRes
            : {});
        if (savedContent && typeof savedContent === "object") {
          setWebsiteContentJson(savedContent);
          const fromContent = String(savedContent.google_place_id || savedContent.googlePlaceId || "").trim();
          const catalog = getCatalogRestaurant(restaurantId);
          const envFallback = catalog
            ? getEnvGooglePlaceIdForSlug(catalog.slug) || catalog.googlePlaceId || ""
            : "";
          setGooglePlaceId(fromContent || String(envFallback || "").trim());
          setGooglePlaceSyncedAt(
            String(savedContent.google_place_synced_at || savedContent.googlePlaceSyncedAt || "").trim()
          );
          setThemeForm(resolvePublicTheme(savedContent));
        }

        if (configRes?.noConfig || !cfg) {
          setSlotsByDay(apiSlotsToSlotsByDay([]));
        } else {
          setConfig(cfg);
          const rawSlots =
            cfg?.opening_slots ??
            cfg?.slots ??
            cfg?.data?.opening_slots ??
            [];
          setSlotsByDay(apiSlotsToSlotsByDay(rawSlots));
          setEditConfig({
            default_reservation_duration: cfg?.configuration?.default_reservation_duration ?? cfg?.default_reservation_duration ?? 90,
            max_party_size: cfg?.configuration?.max_party_size ?? cfg?.max_party_size ?? 10,
            reservation_start_buffer: cfg?.configuration?.reservation_start_buffer ?? cfg?.reservation_start_buffer ?? 0,
            reservation_end_buffer: cfg?.configuration?.reservation_end_buffer ?? cfg?.reservation_end_buffer ?? 0,
          });
        }

        if (pay) {
          setPaymentConfig({
            stripe_enabled: pay?.stripe_enabled ?? true,
            pickup_enabled: pay?.pickup_enabled ?? true,
          });
        }
        setEditRestaurant({
          name: rest?.name ?? "",
          address: rest?.address ?? "",
          phone: rest?.phone ?? "",
          google_business_url: rest?.google_business_url ?? "",
          logo_url: rest?.logo_url ?? "",
          social_x_url: rest?.social_x_url ?? rest?.social_links?.x ?? "",
          social_facebook_url: rest?.social_facebook_url ?? rest?.social_links?.facebook ?? "",
          social_instagram_url: rest?.social_instagram_url ?? rest?.social_links?.instagram ?? "",
          social_tiktok_url: rest?.social_tiktok_url ?? rest?.social_links?.tiktok ?? "",
          google_maps_url: rest?.google_maps_url ?? rest?.social_links?.google_maps ?? "",
          tripadvisor_url: rest?.tripadvisor_url ?? rest?.social_links?.tripadvisor ?? "",
        });
      })
      .catch((err) => setError(err?.message || err?.data?.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, [restaurantId, token, restaurant?.id]);

  const handleSaveRestaurant = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const id = restaurant?.id ?? restaurantId;
      let res;
      if (logoFile instanceof File && logoFile.size > 0) {
        const fd = new FormData();
        fd.append("_method", "PUT");
        fd.append("name", editRestaurant.name);
        fd.append("address", editRestaurant.address);
        fd.append("phone", editRestaurant.phone);
        fd.append("google_business_url", editRestaurant.google_business_url || "");
        fd.append("logo", logoFile);
        res = await updateOwnerRestaurant(id, fd, token);
        setLogoFile(null);
        setLogoCacheBust(Date.now());
      } else {
        res = await updateOwnerRestaurant(id, editRestaurant, token);
      }
      const updated = res?.data ?? res?.restaurant ?? res;
      if (updated && typeof updated === "object") {
        const merged = {
          name: updated.name ?? editRestaurant.name,
          address: updated.address ?? editRestaurant.address,
          phone: updated.phone ?? editRestaurant.phone,
          google_business_url: updated.google_business_url ?? editRestaurant.google_business_url,
          logo_url: updated.logo_url ?? editRestaurant.logo_url,
          social_x_url: updated.social_x_url ?? editRestaurant.social_x_url,
          social_facebook_url: updated.social_facebook_url ?? editRestaurant.social_facebook_url,
          social_instagram_url: updated.social_instagram_url ?? editRestaurant.social_instagram_url,
          social_tiktok_url: updated.social_tiktok_url ?? editRestaurant.social_tiktok_url,
          google_maps_url: updated.google_maps_url ?? editRestaurant.google_maps_url,
          tripadvisor_url: updated.tripadvisor_url ?? editRestaurant.tripadvisor_url,
        };
        setEditRestaurant(merged);
        onRestaurantUpdate?.({
          ...updated,
          ...merged,
          social_links: {
            x: merged.social_x_url || null,
            facebook: merged.social_facebook_url || null,
            instagram: merged.social_instagram_url || null,
            tiktok: merged.social_tiktok_url || null,
            google_maps: merged.google_maps_url || null,
            tripadvisor: merged.tripadvisor_url || null,
          },
        });
      } else {
        // API returned success but no restaurant object – propagate form values optimistically
        onRestaurantUpdate?.({
          name: editRestaurant.name,
          address: editRestaurant.address,
          phone: editRestaurant.phone,
          google_business_url: editRestaurant.google_business_url,
          logo_url: editRestaurant.logo_url,
          social_x_url: editRestaurant.social_x_url,
          social_facebook_url: editRestaurant.social_facebook_url,
          social_instagram_url: editRestaurant.social_instagram_url,
          social_tiktok_url: editRestaurant.social_tiktok_url,
          google_maps_url: editRestaurant.google_maps_url,
          tripadvisor_url: editRestaurant.tripadvisor_url,
          social_links: {
            x: editRestaurant.social_x_url || null,
            facebook: editRestaurant.social_facebook_url || null,
            instagram: editRestaurant.social_instagram_url || null,
            tiktok: editRestaurant.social_tiktok_url || null,
            google_maps: editRestaurant.google_maps_url || null,
            tripadvisor: editRestaurant.tripadvisor_url || null,
          },
        });
      }
      setSuccess("Restaurant details updated.");
      // Don't call onRefresh here – it can overwrite with stale cached data; parent is already updated via onRestaurantUpdate
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to update";
      const validationErrors = err?.data?.errors;
      const detail = validationErrors && typeof validationErrors === "object"
        ? Object.values(validationErrors).flat().join(" ")
        : "";
      setError(detail ? `${msg}: ${detail}` : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateRestaurantConfig(token, restaurantId, editConfig);
      setSuccess("Reservation config updated.");
    } catch (err) {
      setError(err?.message || err?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSlots = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const apiSlots = slotsByDayToApi(slotsByDay);
      const res = await updateOpeningSlots(token, restaurantId, { slots: apiSlots });
      const savedSlots =
        res?.data?.opening_slots ?? res?.opening_slots ?? res?.data ?? null;
      if (Array.isArray(savedSlots) && savedSlots.length >= 0) {
        setSlotsByDay(apiSlotsToSlotsByDay(savedSlots));
      }
      setSuccess("Opening hours updated.");
    } catch (err) {
      const msg = err?.message || err?.data?.message || "Failed to update";
      const validationErrors = err?.data?.errors;
      const detail =
        validationErrors && typeof validationErrors === "object"
          ? Object.values(validationErrors).flat().join(" ")
          : "";
      setError(detail ? `${msg}: ${detail}` : msg);
    } finally {
      setSaving(false);
    }
  };

  const copyDayToAll = (fromDay) => {
    const sourceSlots = (slotsByDay[fromDay] || []).map((s) => ({
      open_time: (s.open_time || "09:00:00").length === 5 ? `${s.open_time}:00` : s.open_time || "09:00:00",
      close_time: (s.close_time || "17:00:00").length === 5 ? `${s.close_time}:00` : s.close_time || "17:00:00",
    }));
    const next = { ...slotsByDay };
    DAYS.forEach((d) => {
      next[d] = sourceSlots.length ? sourceSlots.map((slot) => ({ ...slot })) : [];
    });
    setSlotsByDay(next);
    setSuccess("Opening hours copied to all days.");
  };

  const persistWebsiteContentPatch = async (patch) => {
    let base = websiteContentJson;
    try {
      const fresh = await getOwnerWebsiteContent(token, restaurantId);
      const saved =
        fresh?.content_json ??
        fresh?.data?.content_json ??
        (fresh?.data && typeof fresh.data === "object" && !Array.isArray(fresh.data) ? fresh.data : null);
      if (saved && typeof saved === "object") base = saved;
    } catch {
      // Keep in-memory copy if reload fails.
    }
    const nextContent = { ...base, ...patch };
    await updateOwnerWebsiteContent(token, restaurantId, nextContent);
    setWebsiteContentJson(nextContent);
    return nextContent;
  };

  const persistGooglePlaceId = async (placeIdValue) => {
    const trimmed = String(placeIdValue || "").trim();
    const nextContent = await persistWebsiteContentPatch({
      google_place_id: trimmed,
      googlePlaceId: trimmed,
    });
    setGooglePlaceId(trimmed);
    return nextContent;
  };

  const handleSaveTheme = async (e) => {
    e.preventDefault();
    if (!isHexColor(themeForm.accent) || !isHexColor(themeForm.background) || !isHexColor(themeForm.foreground)) {
      setError("Theme colors must be 6-digit hex values, e.g. #c59d5f.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await persistWebsiteContentPatch({
        theme_accent: themeForm.accent,
        themeAccent: themeForm.accent,
        theme_background: themeForm.background,
        themeBackground: themeForm.background,
        theme_foreground: themeForm.foreground,
        themeForeground: themeForm.foreground,
        theme_font_pair: themeForm.fontPair,
        themeFontPair: themeForm.fontPair,
      });
      setSuccess("Public site theme saved. Refresh the website to see colors and fonts.");
    } catch (err) {
      setError(err?.message || err?.data?.message || "Failed to save theme");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGooglePlaceId = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await persistGooglePlaceId(googlePlaceId);
      setSuccess(
        googlePlaceId.trim()
          ? "Google Place ID saved. Sync hours from Google to fill the slots."
          : "Google Place ID cleared."
      );
    } catch (err) {
      setError(err?.message || err?.data?.message || "Failed to save Place ID");
    } finally {
      setSaving(false);
    }
  };

  const handleSyncGoogleHours = async () => {
    setSyncingGoogle(true);
    setError("");
    setSuccess("");
    try {
      const trimmed = googlePlaceId.trim();
      if (trimmed) {
        await persistGooglePlaceId(trimmed);
      }
      const res = await syncGooglePlaceHours(token, restaurantId, trimmed);
      if (Array.isArray(res?.slots)) {
        setSlotsByDay(apiSlotsToSlotsByDay(res.slots));
      }
      if (res?.placeId) setGooglePlaceId(res.placeId);
      if (res?.syncedAt) setGooglePlaceSyncedAt(res.syncedAt);
      if (res?.address) {
        setEditRestaurant((prev) => ({ ...prev, address: res.address }));
        onRestaurantUpdate?.({ address: res.address });
      }
      setWebsiteContentJson((prev) => ({
        ...prev,
        google_place_id: res?.placeId || trimmed,
        google_place_synced_at: res?.syncedAt || prev.google_place_synced_at,
      }));
      setSuccess("Opening hours synced from Google.");
    } catch (err) {
      setError(err?.data?.error || err?.message || err?.data?.message || "Failed to sync from Google");
    } finally {
      setSyncingGoogle(false);
    }
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      await updateRestaurantPaymentConfig(token, restaurantId, paymentConfig);
      setSuccess("Payment gateways updated.");
    } catch (err) {
      setError(err?.message || err?.data?.message || "Failed to update");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSocialLinks = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const id = restaurant?.id ?? restaurantId;
      const payload = {
        // Include stable core fields so backend validators that require name/address won't reject social-only updates.
        name: editRestaurant.name || "",
        address: editRestaurant.address || "",
        phone: editRestaurant.phone || "",
        google_business_url: editRestaurant.google_business_url || "",
        social_x_url: editRestaurant.social_x_url || "",
        social_facebook_url: editRestaurant.social_facebook_url || "",
        social_instagram_url: editRestaurant.social_instagram_url || "",
        social_tiktok_url: editRestaurant.social_tiktok_url || "",
        google_maps_url: editRestaurant.google_maps_url || "",
        tripadvisor_url: editRestaurant.tripadvisor_url || "",
      };
      const res = await updateOwnerRestaurant(id, payload, token);
      const updated = res?.data ?? res?.restaurant ?? res ?? {};
      const merged = {
        ...payload,
        social_x_url: updated.social_x_url ?? payload.social_x_url,
        social_facebook_url: updated.social_facebook_url ?? payload.social_facebook_url,
        social_instagram_url: updated.social_instagram_url ?? payload.social_instagram_url,
        social_tiktok_url: updated.social_tiktok_url ?? payload.social_tiktok_url,
        google_maps_url: updated.google_maps_url ?? payload.google_maps_url,
        tripadvisor_url: updated.tripadvisor_url ?? payload.tripadvisor_url,
      };
      setEditRestaurant((prev) => ({ ...prev, ...merged }));
      onRestaurantUpdate?.({
        ...updated,
        ...merged,
        social_links: {
          x: merged.social_x_url || null,
          facebook: merged.social_facebook_url || null,
          instagram: merged.social_instagram_url || null,
          tiktok: merged.social_tiktok_url || null,
          google_maps: merged.google_maps_url || null,
          tripadvisor: merged.tripadvisor_url || null,
        },
      });
      setSuccess("Social links updated.");
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to update social links";
      const validationErrors = err?.data?.errors;
      const detail = validationErrors && typeof validationErrors === "object"
        ? Object.values(validationErrors).flat().join(" ")
        : "";
      setError(detail ? `${msg}: ${detail}` : msg);
    } finally {
      setSaving(false);
    }
  };

  // Unified design tokens (match MenuTab / ReservationsTab styling)
  const inputClass =
    "w-full h-10 rounded-md border border-owner-border bg-owner-paper px-3 text-sm text-owner-charcoal placeholder:text-owner-muted outline-none focus:ring-1 focus:ring-owner-action";
  const labelClass = "mb-1 block text-xs font-semibold text-owner-charcoal";
  const sectionClass = "owner-card rounded-lg p-4 border border-owner-border";
  const sectionTitleClass = "mb-3 text-base font-semibold text-owner-charcoal";
  const sectionDescClass = "mb-3 text-xs text-owner-muted";
  const btnPrimaryClass =
    "touch-manipulation inline-flex h-10 items-center justify-center rounded-md bg-owner-action px-4 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50";
  const btnSecondaryClass =
    "touch-manipulation inline-flex h-9 items-center justify-center rounded-md border border-owner-border bg-owner-card px-3 text-sm font-medium text-owner-charcoal hover:bg-owner-paper";
  const timeInputClass =
    "touch-manipulation h-9 rounded-md border border-owner-border bg-owner-paper px-2 text-sm text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action";

  const navItems = [
    { id: "restaurant-details", label: "Restaurant details" },
    { id: "public-theme", label: "Theme" },
    { id: "social-links", label: "Social links" },
    ...(isBakery ? [] : [{ id: "reservation-rules", label: "Reservation rules" }]),
    { id: "payment-gateways", label: "Payment gateways" },
    { id: "opening-hours", label: "Opening hours" },
    { id: "device", label: "Device" },
  ];

  if (loading) return <p className="text-sm text-owner-muted">Loading settings...</p>;

  return (
    <div className="flex flex-col lg:flex-row lg:gap-6 max-w-full min-w-0">
      {/* Mobile: sticky horizontal pill nav */}
      <nav
        aria-label="Settings navigation"
        className="lg:hidden -mx-1 mb-2 overflow-x-auto px-1 pb-1"
      >
        <div className="flex gap-1.5 min-w-max">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="touch-manipulation owner-tab-button-transition inline-flex shrink-0 h-8 items-center rounded-full border border-owner-border bg-owner-card px-3 text-xs font-medium text-owner-charcoal hover:bg-owner-paper active:scale-[0.97]"
            >
              {item.label}
            </a>
          ))}
        </div>
      </nav>

      {/* Desktop side nav */}
      <nav
        aria-label="Settings navigation"
        className="hidden lg:block lg:w-48 lg:shrink-0 lg:sticky lg:top-20 lg:self-start"
      >
        <div className={sectionClass}>
          <p className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-widest text-owner-muted">
            Settings
          </p>
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  className="owner-tab-button-transition block rounded-md px-3 py-2 text-xs font-medium text-owner-charcoal hover:bg-owner-paper"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Toast notifications */}
      {(success || error) && (
        <div
          className="fixed bottom-4 right-4 left-auto z-50 flex max-w-sm flex-col gap-2 max-sm:left-4 max-sm:right-4 max-sm:bottom-4 max-sm:pb-[env(safe-area-inset-bottom)]"
          aria-live="polite"
        >
          {error && (
            <div
              className="rounded-lg border border-red-200 bg-white p-3 shadow-lg dark:border-red-800 dark:bg-red-950/95"
              role="alert"
            >
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
              <button
                type="button"
                onClick={() => setError("")}
                className="mt-1 text-xs font-medium text-red-500 underline hover:no-underline dark:text-red-400"
              >
                Dismiss
              </button>
            </div>
          )}
          {success && (
            <div
              className="rounded-lg border border-owner-success/40 bg-white p-3 shadow-lg dark:bg-owner-success/10"
              role="status"
            >
              <p className="text-sm font-medium text-owner-success">{success}</p>
            </div>
          )}
        </div>
      )}

      {/* Main content */}
      <div className="min-w-0 flex-1 space-y-4 scroll-smooth">
      <section id="restaurant-details" className={sectionClass}>
        <h3 className={sectionTitleClass}>Restaurant details</h3>
        <form onSubmit={handleSaveRestaurant} className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Name</span>
            <input
              type="text"
              value={editRestaurant.name}
              onChange={(e) => setEditRestaurant((p) => ({ ...p, name: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Phone</span>
            <input
              type="text"
              value={editRestaurant.phone}
              onChange={(e) => setEditRestaurant((p) => ({ ...p, phone: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className={labelClass}>Address</span>
            <input
              type="text"
              value={editRestaurant.address}
              onChange={(e) => setEditRestaurant((p) => ({ ...p, address: e.target.value }))}
              className={inputClass}
            />
          </label>
          <label className="block md:col-span-2">
            <span className={labelClass}>Google Business URL</span>
            <input
              type="url"
              value={editRestaurant.google_business_url}
              onChange={(e) => setEditRestaurant((p) => ({ ...p, google_business_url: e.target.value }))}
              placeholder="https://..."
              className={inputClass}
            />
          </label>
          <div className="md:col-span-2">
            <span className={labelClass}>Restaurant logo</span>
            {(editRestaurant.logo_url || logoFile) && (
              <div className="mb-2 flex items-center gap-3">
                <img
                  src={
                    logoFile
                      ? URL.createObjectURL(logoFile)
                      : editRestaurant.logo_url
                        ? `${editRestaurant.logo_url}${editRestaurant.logo_url.includes("?") ? "&" : "?"}v=${logoCacheBust}`
                        : ""
                  }
                  alt="Logo preview"
                  className="h-14 w-14 rounded-md object-cover border border-owner-border"
                />
                {logoFile && (
                  <span className="text-xs text-owner-muted">New image selected</span>
                )}
              </div>
            )}
            <ImageUploadDropzone
              id="restaurant-logo-upload"
              label=""
              value={logoFile}
              onChange={setLogoFile}
              onError={setError}
              accept="image/jpeg,image/png,image/jpg"
              dropHint="Drop logo or click to choose (max 500 KB)"
              className="mt-1"
            />
            <span className="mt-1 block text-[11px] text-owner-muted">JPEG, PNG or JPG, max 500 KB</span>
          </div>
          <div className="md:col-span-2 flex justify-end pt-1">
            <button type="submit" disabled={saving} className={btnPrimaryClass}>
              {saving ? "Saving..." : "Save restaurant"}
            </button>
          </div>
        </form>
      </section>

      <section id="public-theme" className={sectionClass}>
        <h3 className={sectionTitleClass}>Public site theme</h3>
        <p className={sectionDescClass}>
          Colors and fonts for the customer website only. The owner dashboard stays the same for every restaurant.
        </p>
        <form onSubmit={handleSaveTheme} className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { key: "accent", label: "Accent" },
              { key: "background", label: "Background" },
              { key: "foreground", label: "Text" },
            ].map((field) => (
              <label key={field.key} className="block">
                <span className={labelClass}>{field.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={isHexColor(themeForm[field.key]) ? themeForm[field.key] : DEFAULT_PUBLIC_THEME[field.key]}
                    onChange={(e) => setThemeForm((p) => ({ ...p, [field.key]: e.target.value }))}
                    className="h-10 w-12 cursor-pointer rounded-md border border-owner-border bg-owner-paper p-1"
                    aria-label={`${field.label} color`}
                  />
                  <input
                    type="text"
                    value={themeForm[field.key]}
                    onChange={(e) => setThemeForm((p) => ({ ...p, [field.key]: e.target.value }))}
                    className={inputClass}
                    placeholder="#c59d5f"
                    spellCheck={false}
                  />
                </div>
              </label>
            ))}
          </div>
          <label className="block">
            <span className={labelClass}>Typography</span>
            <select
              value={themeForm.fontPair}
              onChange={(e) => setThemeForm((p) => ({ ...p, fontPair: e.target.value }))}
              className={inputClass}
            >
              {FONT_PAIRS.map((pair) => (
                <option key={pair.id} value={pair.id}>
                  {pair.label}
                </option>
              ))}
            </select>
          </label>
          <ThemeLivePreview
            themeForm={themeForm}
            restaurantName={editRestaurant.name || restaurant?.name || "Restaurant"}
          />
          <div className="flex justify-end">
            <button type="submit" disabled={saving} className={btnPrimaryClass}>
              {saving ? "Saving..." : "Save theme"}
            </button>
          </div>
        </form>
      </section>

      <section id="social-links" className={sectionClass}>
        <h3 className={sectionTitleClass}>Social links</h3>
        <p className={sectionDescClass}>
          Public profile URLs shown on your website (X, Facebook, Instagram, TikTok, Google Maps, Tripadvisor).
        </p>
        <form onSubmit={handleSaveSocialLinks} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <label>
              <span className={labelClass}>X URL</span>
              <input
                type="url"
                value={editRestaurant.social_x_url}
                onChange={(e) => setEditRestaurant((p) => ({ ...p, social_x_url: e.target.value }))}
                placeholder="https://x.com/your-page"
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Facebook URL</span>
              <input
                type="url"
                value={editRestaurant.social_facebook_url}
                onChange={(e) => setEditRestaurant((p) => ({ ...p, social_facebook_url: e.target.value }))}
                placeholder="https://facebook.com/your-page"
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Instagram URL</span>
              <input
                type="url"
                value={editRestaurant.social_instagram_url}
                onChange={(e) => setEditRestaurant((p) => ({ ...p, social_instagram_url: e.target.value }))}
                placeholder="https://instagram.com/your-page"
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>TikTok URL</span>
              <input
                type="url"
                value={editRestaurant.social_tiktok_url}
                onChange={(e) => setEditRestaurant((p) => ({ ...p, social_tiktok_url: e.target.value }))}
                placeholder="https://tiktok.com/@your-page"
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Google Maps URL</span>
              <input
                type="url"
                value={editRestaurant.google_maps_url}
                onChange={(e) => setEditRestaurant((p) => ({ ...p, google_maps_url: e.target.value }))}
                placeholder="https://maps.google.com/..."
                className={inputClass}
              />
            </label>
            <label>
              <span className={labelClass}>Tripadvisor URL</span>
              <input
                type="url"
                value={editRestaurant.tripadvisor_url}
                onChange={(e) => setEditRestaurant((p) => ({ ...p, tripadvisor_url: e.target.value }))}
                placeholder="https://tripadvisor.com/..."
                className={inputClass}
              />
            </label>
          </div>

          <div className="flex items-center justify-end pt-1">
            <button type="submit" disabled={saving} className={btnPrimaryClass}>
              {saving ? "Saving..." : "Save social links"}
            </button>
          </div>
        </form>
      </section>

      {!isBakery ? (
      <section id="reservation-rules" className={sectionClass}>
        <h3 className={sectionTitleClass}>Reservation rules</h3>
        <form onSubmit={handleSaveConfig} className="grid gap-3 md:grid-cols-2">
          <label className="block">
            <span className={labelClass}>Default duration (minutes)</span>
            <input
              type="number"
              min={30}
              max={240}
              value={editConfig.default_reservation_duration}
              onChange={(e) => setEditConfig((p) => ({ ...p, default_reservation_duration: Number(e.target.value) }))}
              className={inputClass}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Max party size</span>
            <input
              type="number"
              min={1}
              max={50}
              value={editConfig.max_party_size}
              onChange={(e) => setEditConfig((p) => ({ ...p, max_party_size: Number(e.target.value) }))}
              className={inputClass}
            />
          </label>
          <div className="md:col-span-2 flex justify-end pt-1">
            <button type="submit" disabled={saving} className={btnPrimaryClass}>
              {saving ? "Saving..." : "Save config"}
            </button>
          </div>
        </form>
      </section>
      ) : null}

      <section id="payment-gateways" className={sectionClass}>
        <h3 className={sectionTitleClass}>Payment gateways</h3>
        <form onSubmit={handleSavePayment} className="space-y-3">
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={paymentConfig.stripe_enabled}
              onChange={(e) => setPaymentConfig((p) => ({ ...p, stripe_enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-owner-action"
            />
            <span className="text-sm text-owner-charcoal">Enable Stripe (card payments)</span>
          </label>
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={paymentConfig.pickup_enabled}
              onChange={(e) => setPaymentConfig((p) => ({ ...p, pickup_enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-owner-action"
            />
            <span className="text-sm text-owner-charcoal">Enable Pay on Pickup</span>
          </label>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={saving} className={btnPrimaryClass}>
              {saving ? "Saving..." : "Save payment gateways"}
            </button>
          </div>
        </form>
      </section>

      <section id="opening-hours" className={sectionClass}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className={`${sectionTitleClass} mb-0`}>Opening hours</h3>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-owner-muted">Copy from:</span>
            <select
              id="copy-from-day"
              className="h-9 rounded-md border border-owner-border bg-owner-paper px-2 text-sm text-owner-charcoal outline-none focus:ring-1 focus:ring-owner-action"
              defaultValue="monday"
            >
              {DAYS.map((d) => (
                <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                const fromDay = document.getElementById("copy-from-day")?.value || "monday";
                copyDayToAll(fromDay);
              }}
              className={btnSecondaryClass}
            >
              Copy to all days
            </button>
          </div>
        </div>
        <p className={sectionDescClass}>
          Set open and close times per day. Add multiple slots for split hours (e.g. lunch and dinner).
        </p>
        <div className="mb-4 rounded-md border border-owner-border bg-owner-paper p-3">
          <label className={labelClass} htmlFor="google-place-id">
            Google Place ID
          </label>
          <p className="mb-2 text-xs text-owner-muted">
            Saved on this restaurant’s website content. The Google API key stays on the Laravel server.
          </p>
          <form onSubmit={handleSaveGooglePlaceId} className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              id="google-place-id"
              type="text"
              value={googlePlaceId}
              onChange={(e) => setGooglePlaceId(e.target.value)}
              placeholder="ChIJ…"
              autoComplete="off"
              className={`${inputClass} sm:flex-1`}
            />
            <button type="submit" disabled={saving || syncingGoogle} className={btnSecondaryClass}>
              {saving ? "Saving..." : "Save Place ID"}
            </button>
            <button
              type="button"
              disabled={saving || syncingGoogle}
              onClick={handleSyncGoogleHours}
              className={btnPrimaryClass}
            >
              {syncingGoogle ? "Syncing..." : "Sync hours from Google"}
            </button>
          </form>
          {googlePlaceSyncedAt ? (
            <p className="mt-2 text-xs text-owner-muted">
              Last Google sync:{" "}
              {(() => {
                const d = new Date(googlePlaceSyncedAt);
                return Number.isNaN(d.getTime()) ? googlePlaceSyncedAt : d.toLocaleString();
              })()}
            </p>
          ) : (
            <p className="mt-2 text-xs text-owner-muted">Not synced yet.</p>
          )}
        </div>
        <form onSubmit={handleSaveSlots} className="space-y-3">
          <div className="space-y-2">
            {DAYS.map((day) => (
              <div key={day} className="rounded-md border border-owner-border bg-owner-paper p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-semibold capitalize text-owner-charcoal">{day}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setSlotsByDay((s) => ({
                        ...s,
                        [day]: [...(s[day] || []), { open_time: "09:00:00", close_time: "17:00:00" }],
                      }))
                    }
                    className="text-xs font-medium text-owner-muted hover:text-owner-charcoal"
                  >
                    + Add slot
                  </button>
                </div>
                {(slotsByDay[day]?.length || 0) > 0 ? (
                  <div className="space-y-2">
                    {(slotsByDay[day] || []).map((slot, idx) => {
                      const openVal = (slot.open_time || "09:00:00").length === 5 ? `${slot.open_time}:00` : (slot.open_time || "09:00:00");
                      const closeVal = (slot.close_time || "17:00:00").length === 5 ? `${slot.close_time}:00` : (slot.close_time || "17:00:00");
                      return (
                        <div key={idx} className="flex flex-wrap items-center gap-2">
                          <select
                            value={openVal}
                            onChange={(e) =>
                              setSlotsByDay((s) => ({
                                ...s,
                                [day]: (s[day] || []).map((sl, i) =>
                                  i === idx ? { ...sl, open_time: e.target.value } : sl
                                ),
                              }))
                            }
                            className={timeInputClass}
                          >
                            {generateTimeOptions().map((t) => (
                              <option key={t} value={t}>{t.slice(0, 5)}</option>
                            ))}
                          </select>
                          <span className="text-xs text-owner-muted">–</span>
                          <select
                            value={closeVal}
                            onChange={(e) =>
                              setSlotsByDay((s) => ({
                                ...s,
                                [day]: (s[day] || []).map((sl, i) =>
                                  i === idx ? { ...sl, close_time: e.target.value } : sl
                                ),
                              }))
                            }
                            className={timeInputClass}
                          >
                            {generateTimeOptions().map((t) => (
                              <option key={t} value={t}>{t.slice(0, 5)}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() =>
                              setSlotsByDay((s) => ({
                                ...s,
                                [day]: (s[day] || []).filter((_, i) => i !== idx),
                              }))
                            }
                            className="text-xs font-medium text-red-500 hover:text-red-400 dark:text-red-400 dark:hover:text-red-300"
                          >
                            Remove
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-owner-muted">Closed</p>
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-end pt-1">
            <button type="submit" disabled={saving} className={btnPrimaryClass}>
              {saving ? "Saving..." : "Save opening hours"}
            </button>
          </div>
        </form>
      </section>

      <section id="device" className={sectionClass}>
        <h3 className={sectionTitleClass}>Device</h3>
        <p className={sectionDescClass}>
          When using the dashboard on a phone or tablet, you can keep the screen on so it does not dim or lock while the dashboard is open. Supported in Chrome and other modern mobile browsers.
        </p>
        {typeof onKeepScreenOnChange === "function" && (
          <label className="flex cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={keepScreenOn}
              onChange={(e) => {
                const enabled = e.target.checked;
                setKeepScreenOnPreference(enabled);
                onKeepScreenOnChange(enabled);
              }}
              className="h-4 w-4 rounded border-owner-border text-owner-action focus:ring-owner-action"
            />
            <span className="text-sm font-medium text-owner-charcoal">
              Keep screen on when dashboard is open
            </span>
          </label>
        )}
        <DeviceNotificationSettings />
        <PrintPreferencesSettings />
      </section>
      </div>
    </div>
  );
}
