"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import {
  getRestaurantPaymentOptions,
  createOrder,
  createPaymentIntent,
  submitGdprConsent,
} from "@/lib/api";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { GdprConsent, buildGdprConsentPayload } from "@/components/GdprConsent";
import { formatCurrencyEURZero as formatPrice } from "@/lib/format-currency";

const RESTAURANT_ID = process.env.NEXT_PUBLIC_RESTAURANT_ID || "9";
const STRIPE_PK = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "";
/** Card checkout is off unless this env is exactly "true" (pause Stripe without removing keys). */
const STRIPE_CHECKOUT_ENABLED =
  String(process.env.NEXT_PUBLIC_ENABLE_STRIPE_CHECKOUT || "").toLowerCase() === "true";

function StripePaymentForm({ clientSecret, customerEmail, onSuccess, onError }) {
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
          return_url: `${typeof window !== "undefined" ? window.location.origin : ""}/orders`,
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
      if (transactionId) {
        onSuccess?.(transactionId);
      } else {
        onError?.("Could not retrieve payment confirmation.");
      }
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
        className="w-full rounded-xl bg-zinc-900 py-3 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {submitting ? "Processing…" : "Pay with Card"}
      </button>
    </form>
  );
}

export default function CheckoutPage() {
  const { token, user, isAuthenticated, loading: authLoading } = useAuth();
  const { items, totalAmount, clearCart, hydrate } = useCart();
  const [paymentOptions, setPaymentOptions] = useState({
    stripe: STRIPE_CHECKOUT_ENABLED,
    pickup: true,
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [stripePromise, setStripePromise] = useState(null);

  const [paymentMethod, setPaymentMethod] = useState("cash_on_delivery");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [gdprConsent, setGdprConsent] = useState(false);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (STRIPE_CHECKOUT_ENABLED && STRIPE_PK) {
      setStripePromise(loadStripe(STRIPE_PK));
    }
  }, []);

  useEffect(() => {
    getRestaurantPaymentOptions(RESTAURANT_ID)
      .then((opts) => {
        setPaymentOptions({
          stripe: STRIPE_CHECKOUT_ENABLED && (opts?.stripe ?? true),
          pickup: opts?.pickup ?? true,
        });
      })
      .catch(() =>
        setPaymentOptions({ stripe: STRIPE_CHECKOUT_ENABLED, pickup: true })
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      setCustomerName(user.name ?? "");
      setCustomerEmail(user.email ?? "");
    }
  }, [user]);

  const availableMethods = [];
  if (STRIPE_CHECKOUT_ENABLED && paymentOptions.stripe && STRIPE_PK) {
    availableMethods.push({ id: "online_payment", label: "Pay with Card (Stripe)" });
  }
  if (paymentOptions.pickup) availableMethods.push({ id: "cash_on_delivery", label: "Pay on Pickup" });

  useEffect(() => {
    if (availableMethods.length > 0 && !availableMethods.find((m) => m.id === paymentMethod)) {
      setPaymentMethod(availableMethods[0].id);
    }
  }, [availableMethods.length, paymentMethod]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <p className="text-center text-zinc-600 dark:text-zinc-300">Loading…</p>
        </main>
      </div>
    );
  }

  // Guests can checkout; they must provide name and at least one of email or phone below.

  if (items.length === 0 && !success) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <p className="text-center text-zinc-600 dark:text-zinc-300">
            Your cart is empty. <Link href="/menu" className="font-medium text-amber-700 underline hover:text-amber-600 dark:text-amber-400 dark:hover:text-amber-300">Browse menu</Link>
          </p>
        </main>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-50">
            <h2 className="text-xl font-semibold text-emerald-900 dark:text-emerald-100">Order placed!</h2>
            <p className="mt-2 text-emerald-800 dark:text-emerald-200">
              {paymentMethod === "cash_on_delivery"
                ? "Pay when you pick up your order."
                : "Your payment has been processed."}
            </p>
            {!isAuthenticated && (
              <p className="mt-3 text-sm text-emerald-800/90 dark:text-emerald-200/90">
                To track this order later, <Link href="/login" className="font-medium underline hover:no-underline">log in</Link> with the same email.
              </p>
            )}
            <Link
              href="/menu"
              className="mt-6 inline-block rounded-xl bg-emerald-700 px-6 py-3 font-medium text-white hover:bg-emerald-600"
            >
              Back to Menu
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const orderItems = items.map(({ item, quantity }) => {
    const fallbackId = typeof item?.id === "string" ? Number(String(item.id).split("::")[0]) : Number(item?.id);
    return {
      menu_item_id: Number(item?.menu_item_id ?? fallbackId ?? item?.id),
      quantity,
    };
  });

  function validateGuestContact() {
    const nameOk = (customerName || "").trim().length > 0;
    const hasEmail = (customerEmail || "").trim().length > 0;
    const hasPhone = (customerPhone || "").trim().length > 0;
    if (!nameOk) {
      setError("Please enter your name.");
      return false;
    }
    if (!isAuthenticated && !hasEmail && !hasPhone) {
      setError("As a guest, please provide at least your email or phone number.");
      return false;
    }
    if (!gdprConsent) {
      setError("Please accept the privacy notice to continue.");
      return false;
    }
    return true;
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    setError("");
    if (!validateGuestContact()) return;
    setSubmitting(true);
    try {
      const authToken = token || undefined;

      // Record the GDPR consent first, before any other server interaction.
      // This way the audit row exists regardless of whether the user later
      // completes payment (online) or successfully creates the order (cash).
      const consentPayload = await buildGdprConsentPayload();
      try {
        await submitGdprConsent(RESTAURANT_ID, consentPayload, authToken);
      } catch (consentErr) {
        const msg =
          consentErr?.data?.message ||
          (consentErr?.data?.errors
            ? Object.values(consentErr.data.errors).flat().join(" ")
            : null) ||
          "Could not record your consent. Please try again.";
        setError(msg);
        setSubmitting(false);
        return;
      }

      if (paymentMethod === "online_payment") {
        if (!STRIPE_CHECKOUT_ENABLED) {
          setError("Card payment is temporarily unavailable. Please choose Pay on Pickup.");
          setSubmitting(false);
          return;
        }
        const piRes = await createPaymentIntent(authToken, {
          restaurant_id: Number(RESTAURANT_ID),
          items: orderItems,
        });
        const secret = piRes?.clientSecret ?? piRes?.client_secret ?? piRes?.data?.clientSecret ?? piRes?.data?.client_secret;
        if (secret) {
          setClientSecret(secret);
          return;
        }
        setError("Could not initialize payment. Try Pay on Pickup instead.");
        return;
      }

      await createOrder(authToken, {
        restaurant_id: Number(RESTAURANT_ID),
        order_type: "pickup",
        items: orderItems,
        payment_method: "cash_on_delivery",
        payment_status: "pending",
        customer_name: (customerName || "").trim(),
        customer_email: (customerEmail || "").trim() || undefined,
        customer_phone: (customerPhone || "").trim() || undefined,
        delivery_instructions: (notes || "").trim() || undefined,
      });
      clearCart();
      setSuccess(true);
    } catch (err) {
      setError(
        err?.data?.message ||
          (err?.data?.errors ? Object.values(err.data.errors).flat().join(" ") : null) ||
          err?.message ||
          "Failed to place order"
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (STRIPE_CHECKOUT_ENABLED && clientSecret && stripePromise) {
    const options = { clientSecret, appearance: { theme: "stripe" } };
    const onlineOrderPayload = {
      restaurant_id: Number(RESTAURANT_ID),
      order_type: "pickup",
      items: orderItems,
      payment_method: "online_payment",
      payment_status: "paid",
      customer_name: (customerName || "").trim(),
      customer_email: (customerEmail || "").trim() || undefined,
      customer_phone: (customerPhone || "").trim() || undefined,
      delivery_instructions: (notes || "").trim() || undefined,
      // GDPR consent has already been recorded against this restaurant via
      // POST /restaurants/{id}/gdpr-consent at submit time, so we do NOT
      // re-send the gdpr_consent_* fields with the order itself.
    };
    return (
      <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
        <Header />
        <main className="mx-auto max-w-2xl px-4 py-12">
          <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Complete Payment</h1>
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
            <p className="mb-4 text-zinc-700 dark:text-zinc-200">Total: {formatPrice(totalAmount)}</p>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-zinc-900 dark:border-zinc-600 dark:bg-white dark:text-zinc-900">
            <Elements stripe={stripePromise} options={options}>
              <StripePaymentForm
                clientSecret={clientSecret}
                customerEmail={customerEmail}
                onSuccess={async (transactionId) => {
                  try {
                    await createOrder(token || undefined, {
                      ...onlineOrderPayload,
                      transaction_id: transactionId,
                    });
                    clearCart();
                    setSuccess(true);
                  } catch (err) {
                    setError(
                      err?.data?.message ||
                        (err?.data?.errors ? Object.values(err.data.errors).flat().join(" ") : null) ||
                        err?.message ||
                        "Order could not be created. Please contact support."
                    );
                  }
                }}
                onError={setError}
              />
            </Elements>
            </div>
            {error && <p className="mt-4 text-sm font-medium text-red-600 dark:text-red-300">{error}</p>}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-8 text-zinc-900 dark:text-zinc-100 md:py-12">
        <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-50">Checkout</h1>

        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-50">Order summary</h2>
          <ul className="space-y-2">
            {items.map(({ item, quantity }) => (
              <li key={item.id} className="flex justify-between gap-3 text-sm">
                <span className="min-w-0 text-zinc-800 dark:text-zinc-200">
                  <span className="notranslate" translate="no">{item.name}</span> × {quantity}
                </span>
                <span className="shrink-0 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">{formatPrice((parseFloat(item.price) || 0) * quantity)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-zinc-200 pt-4 text-lg font-semibold text-zinc-900 dark:border-zinc-600 dark:text-zinc-50">
            Total: {formatPrice(totalAmount)}
          </p>
        </div>

        <form onSubmit={handlePlaceOrder} className="space-y-6 text-zinc-900 dark:text-zinc-100">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950/90 dark:text-red-100">
              <p className="font-medium">{error}</p>
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Payment method
            </label>
            <p className="mb-3 text-xs text-zinc-500 dark:text-zinc-400">
              Select how you would like to pay. Sent to the restaurant backend.
            </p>
            <div className="flex flex-col gap-2">
              {availableMethods.map((m) => (
                <label key={m.id} className="flex cursor-pointer items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50/80 p-4 text-zinc-900 transition-colors hover:border-zinc-300 dark:border-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-50 dark:hover:border-zinc-500">
                  <input
                    type="radio"
                    name="payment"
                    value={m.id}
                    checked={paymentMethod === m.id}
                    onChange={() => setPaymentMethod(m.id)}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-50">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {!isAuthenticated && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-950 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-50">
              Checking out as guest: please enter your name and at least one of email or phone.
              {" "}
              <span className="text-amber-900/90 dark:text-amber-100/95">To track your order later, <Link href="/login" className="font-semibold underline hover:no-underline">log in</Link> before or after placing it.</span>
            </p>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Name *</label>
            <input
              type="text"
              required
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Email {!isAuthenticated ? "(required if no phone)" : ""}
            </label>
            <input
              type="email"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Phone {!isAuthenticated ? "(required if no email)" : ""}
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-zinc-300 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              placeholder="Special requests, allergies, etc."
            />
          </div>

          <GdprConsent
            id="checkout-gdpr-consent"
            variant="light"
            checked={gdprConsent}
            onChange={setGdprConsent}
          />

          <button
            type="submit"
            disabled={submitting || !gdprConsent}
            className="w-full rounded-xl bg-zinc-900 py-4 font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {submitting ? "Placing order…" : `Place order · ${formatPrice(totalAmount)}`}
          </button>
        </form>
      </main>
    </div>
  );
}
