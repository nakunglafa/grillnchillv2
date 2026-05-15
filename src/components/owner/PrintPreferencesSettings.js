"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  RECEIPT_PRINTER_PRESETS,
  getOwnerPrintPreferences,
  setOwnerPrintPreferences,
  getResolvedPrinterDisplayLabel,
} from "@/lib/owner-print-preferences";

const labelClass = "text-sm font-medium text-owner-charcoal";
const descClass = "text-xs leading-snug text-owner-muted";
const inputClass =
  "mt-1 w-full rounded-lg border border-owner-border bg-owner-card px-3 py-2 text-sm text-owner-charcoal outline-none focus:ring-2 focus:ring-owner-action/30";

export function PrintPreferencesSettings() {
  const { isAuthenticated } = useAuth();
  const [search, setSearch] = useState("");
  const [presetId, setPresetId] = useState(null);
  const [customLabel, setCustomLabel] = useState("");
  const [paperWidthMm, setPaperWidthMm] = useState(80);
  const [savedMsg, setSavedMsg] = useState("");
  const saveTimerRef = useRef(null);

  const showSaved = useCallback(() => {
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    setSavedMsg("Saved.");
    saveTimerRef.current = window.setTimeout(() => setSavedMsg(""), 2000);
  }, []);

  const persist = useCallback(
    (next) => {
      setOwnerPrintPreferences(next);
      showSaved();
    },
    [showSaved]
  );

  useEffect(() => {
    if (!isAuthenticated || typeof window === "undefined") return;
    const p = getOwnerPrintPreferences();
    setPresetId(p.presetId);
    setCustomLabel(p.customLabel);
    setPaperWidthMm(p.paperWidthMm);
  }, [isAuthenticated]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    },
    []
  );

  const filteredPresets = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return RECEIPT_PRINTER_PRESETS;
    return RECEIPT_PRINTER_PRESETS.filter(
      (x) => x.label.toLowerCase().includes(q) || x.id.toLowerCase().includes(q)
    );
  }, [search]);

  const resolvedPreview = getResolvedPrinterDisplayLabel({ presetId, customLabel });

  if (!isAuthenticated) return null;

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-owner-border/70 bg-owner-paper/50 px-3 py-3">
      <div>
        <p className={labelClass}>Receipt printer (saved on this device)</p>
        <p className={`${descClass} mt-1`}>
          Browsers cannot see your computer&apos;s printers or pick one for you. Search for your model below to save the
          layout width, add your own label as a reminder, then choose that printer in the system print dialog (or set it as
          your default printer in Windows / macOS).
        </p>
      </div>

      <label className="block">
        <span className={descClass}>Search printer model</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. Epson, Star, 58 mm…"
          className={inputClass}
          autoComplete="off"
        />
      </label>

      {filteredPresets.length > 0 ? (
        <ul
          className="max-h-36 overflow-y-auto rounded-lg border border-owner-border/60 bg-owner-card text-sm"
          role="listbox"
          aria-label="Matching printer presets"
        >
          {filteredPresets.map((p) => {
            const active = presetId === p.id;
            return (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => {
                    setPresetId(p.id);
                    setPaperWidthMm(p.widthMm);
                    persist({ presetId: p.id, paperWidthMm: p.widthMm });
                  }}
                  className={`flex w-full touch-manipulation items-center justify-between gap-2 px-3 py-2 text-left hover:bg-owner-paper ${
                    active ? "bg-owner-paper font-semibold text-owner-charcoal" : "text-owner-charcoal"
                  }`}
                >
                  <span>{p.label}</span>
                  <span className="shrink-0 text-[11px] text-owner-muted">{p.widthMm} mm</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-xs text-owner-muted">No matches — try another word or use the custom label.</p>
      )}

      <label className="block">
        <span className={descClass}>Custom label (optional)</span>
        <input
          type="text"
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          onBlur={() => persist({ customLabel })}
          placeholder='e.g. "Kitchen Epson" or exact name from your PC'
          className={inputClass}
        />
        <p className={`${descClass} mt-1 text-[11px]`}>
          Shown on the receipt as a reminder. Overrides the preset name when filled.
        </p>
      </label>

      <fieldset className="space-y-2">
        <legend className={descClass}>Paper width for receipt layout</legend>
        <div className="flex flex-wrap gap-3">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="paper-mm"
              checked={paperWidthMm === 80}
              onChange={() => {
                setPaperWidthMm(80);
                persist({ paperWidthMm: 80 });
              }}
              className="h-4 w-4 border-owner-border text-owner-action focus:ring-owner-action"
            />
            <span className="text-sm text-owner-charcoal">80 mm</span>
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="radio"
              name="paper-mm"
              checked={paperWidthMm === 58}
              onChange={() => {
                setPaperWidthMm(58);
                persist({ paperWidthMm: 58 });
              }}
              className="h-4 w-4 border-owner-border text-owner-action focus:ring-owner-action"
            />
            <span className="text-sm text-owner-charcoal">58 mm</span>
          </label>
        </div>
      </fieldset>

      {resolvedPreview ? (
        <p className="rounded-md border border-owner-border/50 bg-owner-card px-2 py-1.5 text-[11px] text-owner-muted">
          Receipt footer reminder:&nbsp;
          <strong className="text-owner-charcoal">{resolvedPreview}</strong>
          {" · Layout "}
          {paperWidthMm} mm
        </p>
      ) : null}

      {savedMsg ? <p className="text-xs text-owner-success">{savedMsg}</p> : null}
    </div>
  );
}
