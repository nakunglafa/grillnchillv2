"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  RECEIPT_PRINTER_PRESETS,
  DEFAULT_PRINT_AGENT_URL,
  getOwnerPrintPreferences,
  setOwnerPrintPreferences,
  getResolvedPrinterDisplayLabel,
} from "@/lib/owner-print-preferences";
import { checkPrintAgentHealth, testPrintAgent } from "@/lib/kitchen-print-agent";

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
  const [agentUrl, setAgentUrl] = useState(DEFAULT_PRINT_AGENT_URL);
  const [autoPrint, setAutoPrint] = useState(true);
  const [browserFallback, setBrowserFallback] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const [agentStatus, setAgentStatus] = useState(null);
  const [agentBusy, setAgentBusy] = useState(false);
  const [agentMsg, setAgentMsg] = useState("");
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
    setAgentUrl(p.agentUrl || DEFAULT_PRINT_AGENT_URL);
    setAutoPrint(p.autoPrint !== false);
    setBrowserFallback(p.browserFallback === true);
  }, [isAuthenticated]);

  useEffect(
    () => () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current);
    },
    []
  );

  const refreshHealth = useCallback(async () => {
    setAgentBusy(true);
    setAgentMsg("");
    try {
      const data = await checkPrintAgentHealth();
      setAgentStatus({
        ok: true,
        printer: data?.printer,
        restaurantName: data?.restaurantName,
      });
    } catch (err) {
      setAgentStatus({ ok: false, error: err?.message || String(err) });
    } finally {
      setAgentBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    void refreshHealth();
  }, [isAuthenticated, refreshHealth, agentUrl]);

  const runTestPrint = useCallback(async () => {
    setAgentBusy(true);
    setAgentMsg("");
    try {
      await testPrintAgent();
      setAgentMsg("Test ticket sent to the kitchen printer.");
      setAgentStatus((prev) => ({ ...(prev || {}), ok: true }));
    } catch (err) {
      const message = err?.message || String(err);
      setAgentMsg(message);
      setAgentStatus({ ok: false, error: message });
    } finally {
      setAgentBusy(false);
    }
  }, []);

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
        <p className={labelClass}>Kitchen print agent</p>
        <p className={`${descClass} mt-1`}>
          Run the local print agent on this PC so tickets go straight to the network kitchen printer (default{" "}
          <code className="text-[11px]">192.168.8.199:9100</code>). New orders can auto-print; use Reprint on an
          order to print again.
        </p>
      </div>

      <label className="block">
        <span className={descClass}>Print agent URL</span>
        <input
          type="url"
          value={agentUrl}
          onChange={(e) => setAgentUrl(e.target.value)}
          onBlur={() => {
            const next = agentUrl.trim().replace(/\/+$/, "") || DEFAULT_PRINT_AGENT_URL;
            setAgentUrl(next);
            persist({ agentUrl: next });
          }}
          placeholder={DEFAULT_PRINT_AGENT_URL}
          className={inputClass}
          autoComplete="off"
        />
      </label>

      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={autoPrint}
          onChange={(e) => {
            const next = e.target.checked;
            setAutoPrint(next);
            persist({ autoPrint: next });
          }}
          className="mt-0.5 h-4 w-4 rounded border-owner-border text-owner-action focus:ring-owner-action"
        />
        <span>
          <span className="text-sm text-owner-charcoal">Auto-print new orders</span>
          <span className={`mt-0.5 block ${descClass}`}>
            When a new order arrives, send one kitchen ticket to the agent (deduped per order).
          </span>
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={browserFallback}
          onChange={(e) => {
            const next = e.target.checked;
            setBrowserFallback(next);
            persist({ browserFallback: next });
          }}
          className="mt-0.5 h-4 w-4 rounded border-owner-border text-owner-action focus:ring-owner-action"
        />
        <span>
          <span className="text-sm text-owner-charcoal">Browser print dialog fallback</span>
          <span className={`mt-0.5 block ${descClass}`}>
            If the agent is unreachable, open the system print dialog instead of showing an error.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={agentBusy}
          onClick={() => void refreshHealth()}
          className="rounded-lg border border-owner-border bg-owner-card px-3 py-1.5 text-sm text-owner-charcoal hover:bg-owner-paper disabled:opacity-50"
        >
          Check agent
        </button>
        <button
          type="button"
          disabled={agentBusy}
          onClick={() => void runTestPrint()}
          className="rounded-lg border border-owner-action/40 bg-owner-action px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
        >
          Test print
        </button>
        {agentStatus?.ok === true ? (
          <span className="text-xs text-owner-success">
            Agent online
            {agentStatus.printer
              ? ` · printer ${agentStatus.printer.host}:${agentStatus.printer.port}`
              : ""}
          </span>
        ) : agentStatus?.ok === false ? (
          <span className="text-xs text-red-700">Agent offline — start print-agent on this PC</span>
        ) : null}
      </div>

      {agentMsg ? (
        <p className={`text-xs ${agentStatus?.ok === false ? "text-red-700" : "text-owner-muted"}`}>{agentMsg}</p>
      ) : null}
      {agentStatus?.ok === false && agentStatus.error ? (
        <p className="text-[11px] leading-snug text-red-700/90">{agentStatus.error}</p>
      ) : null}

      <div className="border-t border-owner-border/60 pt-3">
        <p className={labelClass}>Receipt layout (optional)</p>
        <p className={`${descClass} mt-1`}>
          Label and paper width used for browser fallback receipts. Kitchen tickets from the agent use ESC/POS on the
          network printer.
        </p>
      </div>

      <label className="block">
        <span className={descClass}>Search printer model</span>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="e.g. Xprinter, Epson, 58 mm…"
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
          placeholder='e.g. "Hot kitchen Xprinter"'
          className={inputClass}
        />
      </label>

      <fieldset className="space-y-2">
        <legend className={descClass}>Paper width for browser fallback layout</legend>
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
          Reminder:&nbsp;
          <strong className="text-owner-charcoal">{resolvedPreview}</strong>
          {" · Layout "}
          {paperWidthMm} mm
        </p>
      ) : null}

      {savedMsg ? <p className="text-xs text-owner-success">{savedMsg}</p> : null}
    </div>
  );
}
