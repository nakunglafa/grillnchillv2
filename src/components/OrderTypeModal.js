"use client";

/**
 * Modal prompting Pickup vs Delivery when the customer opens the menu.
 */
export function OrderTypeModal({ open, onSelect, onClose }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-type-title"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-[#141210] p-6 text-white shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-2 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <h2 id="order-type-title" className="pr-8 text-xl font-semibold tracking-tight text-white">
          How would you like your order?
        </h2>
        <p className="mt-2 text-sm text-white/65">
          Choose pickup or delivery. You can change this later at checkout.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelect("pickup")}
            className="flex flex-col items-start gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-5 text-left transition-colors hover:border-accent/70 hover:bg-white/[0.08]"
          >
            <span className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Pickup</span>
            <span className="text-sm text-white/70">Collect your order at the restaurant.</span>
          </button>
          <button
            type="button"
            onClick={() => onSelect("delivery")}
            className="flex flex-col items-start gap-2 rounded-xl border border-white/20 bg-white/[0.04] px-4 py-5 text-left transition-colors hover:border-accent/70 hover:bg-white/[0.08]"
          >
            <span className="text-sm font-semibold uppercase tracking-[0.14em] text-accent">Delivery</span>
            <span className="text-sm text-white/70">We bring it to your address.</span>
          </button>
        </div>
      </div>
    </div>
  );
}
