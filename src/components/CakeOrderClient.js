"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { SyncActiveLocation } from "@/components/SyncActiveLocation";
import { GdprConsent, buildGdprConsentPayload } from "@/components/GdprConsent";
import { useAuth } from "@/context/AuthContext";
import { useOrderingHours } from "@/context/OrderingHoursContext";
import {
  createOrder,
  createPaymentIntent,
  getRestaurantPaymentOptions,
  submitGdprConsent,
} from "@/lib/api";
import {
  CUSTOM_CAKE_MIN_LEAD_MINUTES,
  clearCakeOrderDraftCookie,
  compressCakeSampleImage,
  formatCustomCakeInstructions,
  readCakeOrderDraftCookie,
  writeCakeOrderDraftCookie,
} from "@/lib/cake-order";
import { toCakeSampleNotesUrl } from "@/lib/cake-sample";
import {
  DEFAULT_RESTAURANT_TIMEZONE,
  buildOrderScheduleDateOptions,
  formatScheduledForPayload,
  getOrderScheduleTimeSlots,
} from "@/lib/opening-hours";
import { locationPath, menuPath } from "@/lib/restaurants";
import { formatCurrencyEURZero as formatPrice } from "@/lib/format-currency";
import { useLocalizedPath } from "@/lib/use-locale";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
const STRIPE_CHECKOUT_ENABLED =
  String(process.env.NEXT_PUBLIC_ENABLE_STRIPE_CHECKOUT || "").toLowerCase() === "true";

const STEPS = [
  { id: 1, label: "Cake" },
  { id: 2, label: "Details" },
  { id: 3, label: "Pickup" },
  { id: 4, label: "Contact" },
];

function StripePaymentForm({ clientSecret, customerEmail, onSuccess, onError, returnPath }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements || !clientSecret) return;
    setSubmitting(true);
    try {
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${typeof window !== "undefined" ? window.location.origin : ""}${returnPath || "/en/orders"}`,
          receipt_email: customerEmail || undefined,
        },
        redirect: "if_required",
      });
      if (error) {
        onError?.(error.message);
        return;
      }
      const { paymentIntent } = await stripe.retrievePaymentIntent(clientSecret);
      const transactionId = paymentIntent?.id;
      if (transactionId) onSuccess?.(transactionId);
      else onError?.("Could not retrieve payment confirmation.");
    } catch (err) {
      onError?.(err?.message || "Payment failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      <button
        type="submit"
        disabled={!stripe || !elements || submitting}
        className="w-full rounded-md bg-accent py-3 text-sm font-semibold text-wood-950 hover:bg-accent-hover disabled:opacity-50"
      >
        {submitting ? "Processing…" : "Pay with Card"}
      </button>
    </form>
  );
}

function StepProgress({ step }) {
  return (
    <ol className="mt-6 flex items-center gap-1 sm:gap-2" aria-label="Order steps">
      {STEPS.map((s, i) => {
        const done = step > s.id;
        const active = step === s.id;
        return (
          <li key={s.id} className="flex min-w-0 flex-1 items-center gap-1 sm:gap-2">
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                active
                  ? "bakery-step-active"
                  : done
                    ? "bakery-step-done"
                    : "bakery-step-idle"
              }`}
            >
              {done ? "✓" : s.id}
            </div>
            <span
              className={`hidden truncate text-xs font-medium sm:inline ${
                active ? "bakery-step-label-active" : done ? "bakery-step-label-done" : "bakery-step-label"
              }`}
            >
              {s.label}
            </span>
            {i < STEPS.length - 1 ? (
              <div
                className={`mx-1 hidden h-px flex-1 sm:block ${done ? "bakery-step-rail-done" : "bakery-step-rail"}`}
                aria-hidden
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

/**
 * @param {{ catalog: object, restaurantName?: string, cakes?: Array<object> }} props
 */
export function CakeOrderClient({ catalog, restaurantName, cakes = [] }) {
  const lp = useLocalizedPath();
  const { token, user, loading: authLoading } = useAuth();
  const { openingSlots } = useOrderingHours();

  const [paymentOptions, setPaymentOptions] = useState({
    stripe: STRIPE_CHECKOUT_ENABLED,
    pickup: true,
  });
  const [loadingOpts, setLoadingOpts] = useState(true);
  const [draftReady, setDraftReady] = useState(false);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCakeId, setSelectedCakeId] = useState(null);
  const [selectedVariantId, setSelectedVariantId] = useState(null);
  const [cakeMessage, setCakeMessage] = useState("");
  const [occasion, setOccasion] = useState("");
  const [themeColors, setThemeColors] = useState("");
  const [notes, setNotes] = useState("");
  const [samplePreview, setSamplePreview] = useState("");
  const [sampleUrl, setSampleUrl] = useState("");
  const [sampleUploading, setSampleUploading] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [scheduleDate, setScheduleDate] = useState("");
  const [scheduleTime, setScheduleTime] = useState("");

  const selectedCake = useMemo(
    () => cakes.find((c) => Number(c.id) === Number(selectedCakeId)) || null,
    [cakes, selectedCakeId]
  );
  const selectedVariant = useMemo(() => {
    if (!selectedCake) return null;
    return (
      selectedCake.variants.find((v) => String(v.id) === String(selectedVariantId)) ||
      null
    );
  }, [selectedCake, selectedVariantId]);

  const scheduleDateOptions = useMemo(() => {
    const raw = buildOrderScheduleDateOptions(openingSlots || [], 14, DEFAULT_RESTAURANT_TIMEZONE);
    return raw.filter((opt) => {
      const slots = getOrderScheduleTimeSlots(openingSlots || [], opt.value, {
        timeZone: DEFAULT_RESTAURANT_TIMEZONE,
        minLeadMinutes: CUSTOM_CAKE_MIN_LEAD_MINUTES,
      });
      return slots.length > 0;
    });
  }, [openingSlots]);

  const scheduleTimeOptions = useMemo(
    () =>
      scheduleDate
        ? getOrderScheduleTimeSlots(openingSlots || [], scheduleDate, {
            timeZone: DEFAULT_RESTAURANT_TIMEZONE,
            minLeadMinutes: CUSTOM_CAKE_MIN_LEAD_MINUTES,
          })
        : [],
    [openingSlots, scheduleDate]
  );

  // Restore draft from cookie once
  useEffect(() => {
    const draft = readCakeOrderDraftCookie(catalog.id);
    if (draft) {
      if (draft.step != null) setStep(Math.min(4, Math.max(1, Number(draft.step) || 1)));
      if (draft.selectedCakeId != null) setSelectedCakeId(Number(draft.selectedCakeId));
      if (draft.selectedVariantId != null) setSelectedVariantId(Number(draft.selectedVariantId));
      if (typeof draft.cakeMessage === "string") setCakeMessage(draft.cakeMessage);
      if (typeof draft.occasion === "string") setOccasion(draft.occasion);
      if (typeof draft.themeColors === "string") setThemeColors(draft.themeColors);
      if (typeof draft.notes === "string") setNotes(draft.notes);
      if (typeof draft.sampleUrl === "string") setSampleUrl(draft.sampleUrl);
      if (typeof draft.customerName === "string") setCustomerName(draft.customerName);
      if (typeof draft.customerEmail === "string") setCustomerEmail(draft.customerEmail);
      if (typeof draft.customerPhone === "string") setCustomerPhone(draft.customerPhone);
      if (typeof draft.scheduleDate === "string") setScheduleDate(draft.scheduleDate);
      if (typeof draft.scheduleTime === "string") setScheduleTime(draft.scheduleTime);
      if (typeof draft.paymentMethod === "string") setPaymentMethod(draft.paymentMethod);
      if (draft.gdprConsent === true) setGdprConsent(true);
    }
    setDraftReady(true);
  }, [catalog.id]);

  // Persist draft whenever fields change (after hydrate)
  useEffect(() => {
    if (!draftReady || success) return;
    writeCakeOrderDraftCookie(catalog.id, {
      step,
      selectedCakeId,
      selectedVariantId,
      cakeMessage,
      occasion,
      themeColors,
      notes,
      sampleUrl,
      customerName,
      customerEmail,
      customerPhone,
      scheduleDate,
      scheduleTime,
      paymentMethod,
      gdprConsent,
    });
  }, [
    draftReady,
    success,
    catalog.id,
    step,
    selectedCakeId,
    selectedVariantId,
    cakeMessage,
    occasion,
    themeColors,
    notes,
    sampleUrl,
    customerName,
    customerEmail,
    customerPhone,
    scheduleDate,
    scheduleTime,
    paymentMethod,
    gdprConsent,
  ]);

  useEffect(() => {
    if (!scheduleDate && scheduleDateOptions.length > 0 && draftReady) {
      setScheduleDate((prev) => prev || scheduleDateOptions[0].value);
    }
  }, [scheduleDate, scheduleDateOptions, draftReady]);

  useEffect(() => {
    if (!scheduleDate || !draftReady) return;
    if (scheduleTime && scheduleTimeOptions.includes(scheduleTime)) return;
    setScheduleTime(scheduleTimeOptions[0] || "");
  }, [scheduleDate, scheduleTime, scheduleTimeOptions, draftReady]);

  useEffect(() => {
    if (STRIPE_CHECKOUT_ENABLED && STRIPE_PK) {
      setStripePromise(loadStripe(STRIPE_PK));
    }
  }, []);

  useEffect(() => {
    if (!catalog?.id) {
      setLoadingOpts(false);
      return undefined;
    }
    setLoadingOpts(true);
    getRestaurantPaymentOptions(catalog.id)
      .then((opts) => {
        setPaymentOptions({
          stripe: STRIPE_CHECKOUT_ENABLED && (opts?.stripe ?? true),
          pickup: opts?.pickup ?? true,
        });
      })
      .catch(() => setPaymentOptions({ stripe: STRIPE_CHECKOUT_ENABLED, pickup: true }))
      .finally(() => setLoadingOpts(false));
  }, [catalog?.id]);

  useEffect(() => {
    if (!user || !draftReady) return;
    setCustomerName((prev) => prev || user.name || "");
    setCustomerEmail((prev) => prev || user.email || "");
  }, [user, draftReady]);

  useEffect(() => {
    if (!selectedCake) return;
    const stillValid = selectedCake.variants.some(
      (v) => String(v.id) === String(selectedVariantId)
    );
    if (!stillValid && selectedVariantId != null) {
      setSelectedVariantId(null);
    }
  }, [selectedCake, selectedVariantId]);

  useEffect(() => {
    return () => {
      if (samplePreview) URL.revokeObjectURL(samplePreview);
    };
  }, [samplePreview]);

  const cashLabel = "Pay on Pickup";
  const availableMethods = [];
  if (STRIPE_CHECKOUT_ENABLED && paymentOptions.stripe && STRIPE_PK) {
    availableMethods.push({ id: "online_payment", label: "Pay with Card (Stripe)" });
  }
  if (paymentOptions.pickup) availableMethods.push({ id: "cash_on_delivery", label: cashLabel });

  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.find((m) => m.id === paymentMethod)) {
      setPaymentMethod(availableMethods[0].id);
    }
  }, [availableMethods.length, paymentMethod]);

  const locationHref = locationPath(catalog);
  const menuHref = menuPath(catalog);
  const ordersReturn = lp("/orders");

  function orderLineItems() {
    if (!selectedCake || !selectedVariant) return [];
    const line = {
      menu_item_id: Number(selectedCake.id),
      quantity: 1,
    };
    if (selectedVariant.id != null && !Number.isNaN(Number(selectedVariant.id))) {
      line.variant_id = Number(selectedVariant.id);
    }
    return [line];
  }

  function buildPayload(extra = {}) {
    return {
      restaurant_id: Number(catalog.id),
      order_type: "pickup",
      items: orderLineItems(),
      customer_name: (customerName || "").trim(),
      customer_email: (customerEmail || "").trim(),
      customer_phone: (customerPhone || "").trim(),
      delivery_instructions: formatCustomCakeInstructions({
        flavor: selectedCake?.name || "",
        size: selectedVariant?.typeName || "",
        priceLabel: selectedVariant ? formatPrice(selectedVariant.price) : "",
        cakeMessage,
        occasion,
        themeColors,
        notes,
        sampleImageUrl: toCakeSampleNotesUrl(sampleUrl),
      }),
      scheduled_for: formatScheduledForPayload(scheduleDate, scheduleTime),
      ...extra,
    };
  }

  async function handleSampleChange(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file for the cake sample.");
      return;
    }
    setSampleUploading(true);
    try {
      const compressed = await compressCakeSampleImage(file);
      const preview = URL.createObjectURL(compressed);
      setSamplePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return preview;
      });
      const fd = new FormData();
      fd.append("image", compressed, compressed.name);
      const res = await fetch("/api/cake-sample", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "Could not upload sample image.");
      }
      setSampleUrl(toCakeSampleNotesUrl(data.url || data.full_url || data.relative_url || ""));
    } catch (err) {
      setSamplePreview((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return "";
      });
      setSampleUrl("");
      setError(err?.message || "Could not compress or upload sample image.");
    } finally {
      setSampleUploading(false);
    }
  }

  function clearSample() {
    setSamplePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return "";
    });
    setSampleUrl("");
  }

  function validateStep(n) {
    if (n === 1) {
      if (!selectedCake || !selectedVariant) {
        setError("Please choose a cake flavour and size.");
        return false;
      }
    }
    if (n === 3) {
      if (!scheduleDate || !scheduleTime) {
        setError("Please choose a pickup date and time (at least 48 hours ahead).");
        return false;
      }
      if (scheduleDateOptions.length === 0) {
        setError("No pickup slots available. Please contact the bakery.");
        return false;
      }
    }
    if (n === 4) {
      if (!(customerName || "").trim()) {
        setError("Please enter your name.");
        return false;
      }
      if (!(customerPhone || "").trim()) {
        setError("Please enter your phone number — we need it to confirm your order.");
        return false;
      }
      if (!(customerEmail || "").trim()) {
        setError("Please enter your email — we use it for order notifications.");
        return false;
      }
      if (!gdprConsent) {
        setError("Please accept the privacy notice to continue.");
        return false;
      }
    }
    return true;
  }

  function goNext() {
    setError("");
    if (!validateStep(step)) return;
    setStep((s) => Math.min(4, s + 1));
  }

  function goBack() {
    setError("");
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!validateStep(1) || !validateStep(3) || !validateStep(4)) return;
    setSubmitting(true);
    try {
      const authToken = token || undefined;
      const consentPayload = await buildGdprConsentPayload();
      try {
        await submitGdprConsent(catalog.id, consentPayload, authToken);
      } catch (consentErr) {
        setError(
          consentErr?.data?.message ||
            (consentErr?.data?.errors
              ? Object.values(consentErr.data.errors).flat().join(" ")
              : null) ||
            "Could not record your consent. Please try again."
        );
        setSubmitting(false);
        return;
      }

      const items = orderLineItems();

      if (paymentMethod === "online_payment") {
        if (!STRIPE_CHECKOUT_ENABLED) {
          setError(`Card payment is temporarily unavailable. Please choose ${cashLabel}.`);
          setSubmitting(false);
          return;
        }
        const piRes = await createPaymentIntent(authToken, {
          restaurant_id: Number(catalog.id),
          items,
        });
        const secret =
          piRes?.clientSecret ??
          piRes?.client_secret ??
          piRes?.data?.clientSecret ??
          piRes?.data?.client_secret;
        if (secret) {
          setClientSecret(secret);
          return;
        }
        setError(`Could not initialize payment. Try ${cashLabel} instead.`);
        return;
      }

      await createOrder(
        authToken,
        buildPayload({
          payment_method: "cash_on_delivery",
          payment_status: "pending",
        })
      );
      clearCakeOrderDraftCookie(catalog.id);
      setSuccess(true);
    } catch (err) {
      setError(
        err?.data?.message ||
          (err?.data?.errors ? Object.values(err.data.errors).flat().join(" ") : null) ||
          err?.message ||
          "Failed to submit cake order"
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStripeSuccess(transactionId) {
    setSubmitting(true);
    setError("");
    try {
      await createOrder(
        token || undefined,
        buildPayload({
          payment_method: "online_payment",
          payment_status: "paid",
          transaction_id: transactionId,
        })
      );
      clearCakeOrderDraftCookie(catalog.id);
      setClientSecret(null);
      setSuccess(true);
    } catch (err) {
      setError(
        err?.data?.message ||
          err?.message ||
          "Payment succeeded but order failed. Contact the bakery."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = "bakery-input w-full rounded-md px-3 py-2.5 text-sm outline-none";
  const labelClass = "bakery-label mb-1.5 block text-xs font-semibold uppercase tracking-wide";
  const sectionClass = "bakery-section rounded-xl p-5";
  const btnPrimary =
    "bakery-btn-primary rounded-md px-5 py-2.5 text-sm font-semibold disabled:opacity-50";
  const btnSecondary = "bakery-btn-secondary rounded-md px-5 py-2.5 text-sm font-semibold";

  if (authLoading || loadingOpts || !draftReady) {
    return (
      <div className="bakery-order min-h-screen">
        <SyncActiveLocation restaurantId={catalog.id} />
        <Header variant="marketing" />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <p className="bakery-muted text-center">Loading…</p>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="bakery-order min-h-screen">
        <SyncActiveLocation restaurantId={catalog.id} />
        <Header variant="marketing" />
        <main className="mx-auto max-w-3xl px-4 py-12">
          <div className="bakery-success rounded-2xl p-8 text-center">
            <h2 className="font-display text-2xl font-semibold">Your cake order is in</h2>
            <p className="bakery-muted mt-2 text-sm">
              {selectedCake?.name} · {selectedVariant?.typeName} ·{" "}
              {selectedVariant ? formatPrice(selectedVariant.price) : ""}
            </p>
            <p className="bakery-muted mt-2 text-sm">
              Pickup scheduled for {scheduleDate} at {scheduleTime}. Confirmation goes to{" "}
              {customerEmail}.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href={lp(menuHref)} className={btnPrimary}>
                Shop ready-made
              </Link>
              <Link href={lp(locationHref)} className={btnSecondary}>
                Back to bakery
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="bakery-order min-h-screen">
      <SyncActiveLocation restaurantId={catalog.id} />
      <Header variant="marketing" />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:py-12">
        <p className="bakery-eyebrow text-[11px] font-semibold uppercase tracking-[0.28em]">
          {catalog.shortLabel || "Bakery"}
        </p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Order a custom cake
        </h1>
        <p className="bakery-muted mt-2 max-w-xl text-sm">
          {restaurantName || catalog.label} near Alameda, Arroios and Praça do Chile — a few short
          steps. Your answers are saved if you leave and come back.
        </p>
        <p className="mt-3 text-sm">
          <Link href={lp(menuHref)} className="bakery-link font-medium">
            Prefer ready-made? Shop the menu →
          </Link>
        </p>

        <StepProgress step={step} />

        {cakes.length === 0 ? (
          <div className="bakery-warn mt-8 rounded-xl p-4 text-sm">
            Cake flavours are not available right now. Please{" "}
            <Link href={lp(menuHref)} className="underline">
              browse the menu
            </Link>{" "}
            or contact the bakery.
          </div>
        ) : null}

        {clientSecret && stripePromise ? (
          <div className={`${sectionClass} mt-8`}>
            <h2 className="mb-4 font-display text-xl font-semibold">Card payment</h2>
            {error ? <p className="bakery-error mb-3 text-sm">{error}</p> : null}
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <StripePaymentForm
                clientSecret={clientSecret}
                customerEmail={customerEmail}
                returnPath={ordersReturn}
                onSuccess={(id) => void handleStripeSuccess(id)}
                onError={setError}
              />
            </Elements>
            <button
              type="button"
              className="bakery-muted mt-4 text-sm underline hover:opacity-80"
              onClick={() => setClientSecret(null)}
            >
              Cancel card payment
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            {step === 1 ? (
              <section className={sectionClass}>
                <h2 className="font-display text-xl font-semibold">Choose cake</h2>
                <p className="bakery-muted mt-1 text-xs">
                  Select flavour and size — prices from half-kilo
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <label>
                    <span className={labelClass}>Flavour *</span>
                    <select
                      className={inputClass}
                      value={selectedCakeId ?? ""}
                      onChange={(e) => {
                        const next = e.target.value ? Number(e.target.value) : null;
                        setSelectedCakeId(next);
                        setSelectedVariantId(null);
                      }}
                    >
                      <option value="">Select flavour…</option>
                      {cakes.map((cake) => (
                        <option key={cake.id} value={cake.id}>
                          {cake.name} — from {formatPrice(cake.fromPrice)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className={labelClass}>Size *</span>
                    <select
                      className={inputClass}
                      value={selectedVariantId ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setSelectedVariantId(raw === "" ? null : Number(raw));
                      }}
                      disabled={!selectedCake}
                    >
                      <option value="">
                        {selectedCake ? "Select size…" : "Choose flavour first"}
                      </option>
                      {(selectedCake?.variants || []).map((v) => (
                        <option key={String(v.id ?? v.typeName)} value={v.id ?? ""}>
                          {v.typeName} — {formatPrice(v.price)}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                {selectedVariant ? (
                  <p className="mt-3 text-sm">
                    Total:{" "}
                    <span className="bakery-price font-semibold">
                      {formatPrice(selectedVariant.price)}
                    </span>
                    <span className="bakery-muted">
                      {" "}
                      · {selectedCake?.name} · {selectedVariant.typeName}
                    </span>
                  </p>
                ) : selectedCake ? (
                  <p className="bakery-muted mt-3 text-sm">
                    From {formatPrice(selectedCake.fromPrice)}
                  </p>
                ) : null}
              </section>
            ) : null}

            {step === 2 ? (
              <section className={sectionClass}>
                <h2 className="font-display text-xl font-semibold">Personalise</h2>
                <p className="bakery-muted mt-1 text-xs">Optional — skip anything you don’t need</p>
                <div className="mt-4 space-y-3">
                  <label>
                    <span className={labelClass}>Message on cake</span>
                    <input
                      className={inputClass}
                      value={cakeMessage}
                      onChange={(e) => setCakeMessage(e.target.value)}
                      placeholder="Happy Birthday…"
                      maxLength={80}
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Occasion</span>
                    <input
                      className={inputClass}
                      value={occasion}
                      onChange={(e) => setOccasion(e.target.value)}
                      placeholder="Birthday, wedding, anniversary…"
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Theme colours</span>
                    <input
                      className={inputClass}
                      value={themeColors}
                      onChange={(e) => setThemeColors(e.target.value)}
                      placeholder="e.g. gold & white, soft pink, navy blue"
                    />
                  </label>
                  <label>
                    <span className={labelClass}>Extra notes</span>
                    <textarea
                      className={inputClass}
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Allergies, decorations, filling preferences…"
                    />
                  </label>
                  <div>
                    <span className={labelClass}>Cake sample image (optional)</span>
                    <p className="bakery-muted mb-2 text-xs">
                      Upload a photo or design reference so we can match the look. Images are
                      compressed before upload.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="bakery-upload cursor-pointer rounded-md px-4 py-3 text-sm font-medium">
                        {sampleUploading
                          ? "Compressing & uploading…"
                          : sampleUrl
                            ? "Replace image"
                            : "Upload sample"}
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/jpg"
                          className="sr-only"
                          disabled={sampleUploading}
                          onChange={(e) => void handleSampleChange(e)}
                        />
                      </label>
                      {sampleUrl || samplePreview ? (
                        <button
                          type="button"
                          onClick={clearSample}
                          className="bakery-muted text-xs underline hover:opacity-80"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                    {(samplePreview || sampleUrl) && (
                      <div className="bakery-sample-preview mt-3 overflow-hidden rounded-lg">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={samplePreview || sampleUrl}
                          alt="Cake sample preview"
                          className="max-h-56 w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {step === 3 ? (
              <section className={sectionClass}>
                <h2 className="font-display text-xl font-semibold">Pickup</h2>
                <p className="bakery-muted mt-1 text-xs">Please allow at least 48 hours</p>
                {scheduleDateOptions.length === 0 ? (
                  <p className="bakery-warn mt-3 rounded-md p-3 text-sm">
                    No pickup slots available in the next two weeks. Please contact the bakery.
                  </p>
                ) : (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <label>
                      <span className={labelClass}>Date</span>
                      <select
                        className={inputClass}
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                      >
                        {scheduleDateOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span className={labelClass}>Time</span>
                      <select
                        className={inputClass}
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                      >
                        {scheduleTimeOptions.map((t) => (
                          <option key={t} value={t}>
                            {t}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                )}
              </section>
            ) : null}

            {step === 4 ? (
              <form onSubmit={handleSubmit} className="space-y-6">
                <section className={sectionClass}>
                  <h2 className="font-display text-xl font-semibold">Contact</h2>
                  {(selectedCake && selectedVariant) || scheduleDate ? (
                    <p className="bakery-summary mt-2 rounded-md px-3 py-2 text-xs">
                      {selectedCake?.name} · {selectedVariant?.typeName} ·{" "}
                      {selectedVariant ? formatPrice(selectedVariant.price) : ""}
                      {scheduleDate ? ` · Pickup ${scheduleDate} ${scheduleTime}` : ""}
                    </p>
                  ) : null}
                  <div className="mt-4 space-y-3">
                    <label>
                      <span className={labelClass}>Name *</span>
                      <input
                        className={inputClass}
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        required
                        autoComplete="name"
                      />
                    </label>
                    <label>
                      <span className={labelClass}>Phone *</span>
                      <input
                        type="tel"
                        className={inputClass}
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        required
                        autoComplete="tel"
                        placeholder="+351…"
                      />
                      <span className="bakery-muted mt-1 block text-xs">
                        Required so we can confirm your cake order.
                      </span>
                    </label>
                    <label>
                      <span className={labelClass}>Email *</span>
                      <input
                        type="email"
                        className={inputClass}
                        value={customerEmail}
                        onChange={(e) => setCustomerEmail(e.target.value)}
                        required
                        autoComplete="email"
                      />
                      <span className="bakery-muted mt-1 block text-xs">
                        Used for order confirmation and status notifications.
                      </span>
                    </label>
                  </div>
                </section>

                {availableMethods.length > 1 ? (
                  <section className={sectionClass}>
                    <h2 className="font-display text-xl font-semibold">Payment</h2>
                    <div className="mt-3 space-y-2">
                      {availableMethods.map((m) => (
                        <label key={m.id} className="flex items-center gap-2 text-sm">
                          <input
                            type="radio"
                            name="payment"
                            checked={paymentMethod === m.id}
                            onChange={() => setPaymentMethod(m.id)}
                            className="accent-[var(--bakery-accent,#c45c4a)]"
                          />
                          {m.label}
                        </label>
                      ))}
                    </div>
                  </section>
                ) : null}

                <div className="bakery-section rounded-xl p-4">
                  <GdprConsent checked={gdprConsent} onChange={setGdprConsent} variant="light" />
                </div>

                {error ? (
                  <p role="alert" className="bakery-error text-center text-sm">
                    {error}
                  </p>
                ) : null}

                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={goBack} className={btnSecondary}>
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || sampleUploading || cakes.length === 0}
                    className={`min-w-[10rem] flex-1 ${btnPrimary}`}
                  >
                    {submitting
                      ? "Placing your order…"
                      : selectedVariant
                        ? `Place order · ${formatPrice(selectedVariant.price)}`
                        : "Place order"}
                  </button>
                </div>
              </form>
            ) : null}

            {step < 4 ? (
              <div className="space-y-3">
                {error ? (
                  <p role="alert" className="bakery-error text-center text-sm">
                    {error}
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-3">
                  {step > 1 ? (
                    <button type="button" onClick={goBack} className={btnSecondary}>
                      Back
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={goNext}
                    disabled={step === 1 && cakes.length === 0}
                    className={`min-w-[8rem] flex-1 ${btnPrimary}`}
                  >
                    Next
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </main>
    </div>
  );
}
