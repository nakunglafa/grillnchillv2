"use client";

import { useEffect, useMemo, useState } from "react";
import { updateOwnerRestaurant } from "@/lib/api";

const MAX_TESTIMONIALS = 5;

function normalizeTestimonials(value) {
  const arr = Array.isArray(value) ? value : [];
  return arr
    .map((item) => ({
      reviewer_name: (item?.reviewer_name ?? "").toString(),
      quote: (item?.quote ?? "").toString(),
    }))
    .filter((item) => item.reviewer_name || item.quote);
}

export function TestimonialsTab({ restaurantId, token, restaurant, onRestaurantUpdate }) {
  const [testimonials, setTestimonials] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setTestimonials(normalizeTestimonials(restaurant?.testimonials));
  }, [restaurant?.id, restaurant?.testimonials]);

  useEffect(() => {
    if (!success) return;
    const timeout = setTimeout(() => setSuccess(""), 4000);
    return () => clearTimeout(timeout);
  }, [success]);

  const canAddMore = testimonials.length < MAX_TESTIMONIALS;
  const hasAnyItem = testimonials.length > 0;

  const hasInvalidRows = useMemo(
    () =>
      testimonials.some(
        (item) => !item.reviewer_name.trim() || !item.quote.trim()
      ),
    [testimonials]
  );

  const handleChange = (index, field, value) => {
    setTestimonials((prev) =>
      prev.map((item, idx) =>
        idx === index ? { ...item, [field]: value } : item
      )
    );
  };

  const addRow = () => {
    if (!canAddMore) return;
    setTestimonials((prev) => [...prev, { reviewer_name: "", quote: "" }]);
  };

  const removeRow = (index) => {
    setTestimonials((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const trimmed = testimonials.map((item) => ({
      reviewer_name: item.reviewer_name.trim(),
      quote: item.quote.trim(),
    }));

    if (trimmed.some((item) => !item.reviewer_name || !item.quote)) {
      setError("Each testimonial must include reviewer name and quote.");
      return;
    }

    if (trimmed.length > MAX_TESTIMONIALS) {
      setError(`You can save up to ${MAX_TESTIMONIALS} testimonials.`);
      return;
    }

    setSaving(true);
    try {
      const id = restaurant?.id ?? restaurantId;
      const res = await updateOwnerRestaurant(
        id,
        { testimonials: trimmed },
        token
      );

      const updated = res?.data ?? res?.restaurant ?? res;
      const nextTestimonials = normalizeTestimonials(
        updated?.testimonials ?? trimmed
      );
      setTestimonials(nextTestimonials);
      onRestaurantUpdate?.({ ...updated, testimonials: nextTestimonials });
      setSuccess("Testimonials updated.");
    } catch (err) {
      const msg = err?.data?.message || err?.message || "Failed to update testimonials";
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

  return (
    <div className="space-y-4 max-w-full min-w-0">
      <div className="owner-card rounded-xl border border-owner-border p-5">
        <h3 className="text-lg md:text-base font-semibold text-owner-charcoal">
          Testimonials
        </h3>
        <p className="mt-1 text-sm text-owner-muted">
          Add up to {MAX_TESTIMONIALS} curated testimonials for your restaurant website.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-red-600">{error}</p>
        </div>
      )}
      {success && (
        <div className="rounded-lg border border-owner-success/40 bg-white p-4">
          <p className="text-owner-success">{success}</p>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-4">
        {hasAnyItem ? (
          <ul className="space-y-3">
            {testimonials.map((item, index) => (
              <li key={index} className="owner-card rounded-xl border border-owner-border p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-owner-charcoal">
                    Testimonial {index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    className="touch-manipulation min-h-[40px] rounded-lg border border-red-300 px-3 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
                <div className="grid gap-3">
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-owner-muted">Reviewer name</span>
                    <input
                      type="text"
                      value={item.reviewer_name}
                      onChange={(e) =>
                        handleChange(index, "reviewer_name", e.target.value)
                      }
                      maxLength={255}
                      placeholder="e.g. Maria S."
                      className="w-full rounded-lg border border-owner-border bg-owner-card px-3 py-2 text-owner-charcoal"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="text-sm text-owner-muted">Quote</span>
                    <textarea
                      rows={3}
                      value={item.quote}
                      onChange={(e) => handleChange(index, "quote", e.target.value)}
                      maxLength={1000}
                      placeholder="Write the testimonial quote..."
                      className="w-full rounded-lg border border-owner-border bg-owner-card px-3 py-2 text-owner-charcoal"
                    />
                  </label>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="owner-card rounded-xl border border-owner-border p-5">
            <p className="text-owner-muted">
              No testimonials yet. Add your first one to feature customer feedback.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
          <button
            type="button"
            onClick={addRow}
            disabled={!canAddMore || saving}
            className="touch-manipulation min-h-[48px] flex-1 rounded-xl border border-owner-border px-5 py-3 text-base md:text-sm font-medium text-owner-charcoal hover:bg-owner-paper disabled:opacity-50 sm:flex-none sm:rounded-lg sm:py-2 sm:text-sm"
          >
            {canAddMore ? "Add testimonial" : `Max ${MAX_TESTIMONIALS} reached`}
          </button>
          <button
            type="submit"
            disabled={saving || hasInvalidRows}
            className="touch-manipulation min-h-[48px] flex-1 rounded-xl bg-owner-action px-5 py-3 text-base md:text-sm font-medium text-white hover:opacity-90 disabled:opacity-50 sm:flex-none sm:rounded-lg sm:py-2 sm:text-sm"
          >
            {saving ? "Saving..." : "Save testimonials"}
          </button>
        </div>
      </form>
    </div>
  );
}
