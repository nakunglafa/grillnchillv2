"use client";

import { useState } from "react";
import { ESTIMATED_READY_PRESETS, normalizeEstimatedReadyMinutes } from "@/lib/order-ready-estimate";

/**
 * Pick optional customer-facing wait time for `confirmed` / `preparing` order PATCH.
 * @param {{ onConfirm: (minutes: number | null) => void, onCancel?: () => void, disabled?: boolean, className?: string }} props
 */
export function EstimatedReadyMinutesForm({ onConfirm, onCancel, disabled, className = "" }) {
  const [mode, setMode] = useState("preset");
  const [presetVal, setPresetVal] = useState(20);
  const [customStr, setCustomStr] = useState("");
  const [localError, setLocalError] = useState("");

  function applyPreset(m) {
    setMode("preset");
    setPresetVal(m);
    setCustomStr("");
    setLocalError("");
  }

  function onCustomInput(s) {
    setMode("custom");
    setCustomStr(s);
    setLocalError("");
  }

  function handleConfirmWithEstimate() {
    setLocalError("");
    if (mode === "custom") {
      const m = normalizeEstimatedReadyMinutes(customStr);
      if (m == null) {
        setLocalError("Enter a whole number from 1 to 720.");
        return;
      }
      onConfirm(m);
      return;
    }
    onConfirm(presetVal);
  }

  return (
    <div className={className}>
      <p className="text-sm font-semibold text-owner-charcoal">Estimated ready time</p>
      <p className="mt-0.5 text-xs text-owner-muted">
        Optional. Sent to the API as estimated_ready_minutes (customer email and order view).
      </p>

      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {ESTIMATED_READY_PRESETS.map((m) => (
          <button
            key={m}
            type="button"
            disabled={disabled}
            onClick={() => applyPreset(m)}
            className={[
              "touch-manipulation rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50",
              mode === "preset" && presetVal === m
                ? "bg-emerald-600 text-white shadow"
                : "border border-owner-border bg-owner-paper text-owner-charcoal hover:bg-owner-card",
            ].join(" ")}
          >
            {m} min
          </button>
        ))}
      </div>

      <label className="mt-2.5 block text-[11px] font-semibold uppercase tracking-wide text-owner-muted">
        Custom minutes (1–720, e.g. 35)
      </label>
      <input
        type="number"
        min={1}
        max={720}
        step={5}
        inputMode="numeric"
        disabled={disabled}
        value={customStr}
        onChange={(e) => onCustomInput(e.target.value)}
        placeholder="e.g. 35"
        className="mt-1 w-full rounded-lg border border-owner-border bg-white px-3 py-2 text-sm text-owner-charcoal outline-none focus:border-owner-action disabled:opacity-50"
      />

      {localError && <p className="mt-1.5 text-xs font-medium text-red-700">{localError}</p>}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onConfirm(null)}
          className="touch-manipulation flex-1 rounded-lg border border-owner-border bg-owner-paper px-3 py-2 text-sm font-medium text-owner-charcoal hover:bg-owner-card disabled:opacity-50"
        >
          Confirm without estimate
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={handleConfirmWithEstimate}
          className="touch-manipulation flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Confirm with estimate
        </button>
        {onCancel ? (
          <button
            type="button"
            disabled={disabled}
            onClick={onCancel}
            className="touch-manipulation w-full rounded-lg border border-owner-border px-3 py-2 text-sm font-medium text-owner-muted hover:bg-owner-paper disabled:opacity-50 sm:w-auto"
          >
            Back
          </button>
        ) : null}
      </div>
    </div>
  );
}
