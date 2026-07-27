const STORAGE_KEY = "owner:receipt-print:v1";

/** Common receipt printers (searchable). Width is typical paper width for layout only — not OS binding. */
export const RECEIPT_PRINTER_PRESETS = [
  { id: "epson-tm-m30iii", label: "Epson TM-m30III", widthMm: 80 },
  { id: "epson-tm-m30ii", label: "Epson TM-m30II", widthMm: 80 },
  { id: "epson-tm-t20iii", label: "Epson TM-T20III", widthMm: 80 },
  { id: "epson-tm-t82iii", label: "Epson TM-T82III", widthMm: 80 },
  { id: "xprinter-xp-k260l", label: "Xprinter XP-K260L", widthMm: 80 },
  { id: "star-tsp143iii", label: "Star TSP143III", widthMm: 80 },
  { id: "star-mc-print3", label: "Star mC-Print3", widthMm: 80 },
  { id: "bixolon-srp350iii", label: "Bixolon SRP-350III", widthMm: 80 },
  { id: "generic-thermal-80", label: "Generic thermal 80 mm", widthMm: 80 },
  { id: "generic-thermal-58", label: "Generic thermal 58 mm", widthMm: 58 },
];

export const DEFAULT_PRINT_AGENT_URL = "http://127.0.0.1:9101";

const defaultPrefs = () => ({
  presetId: null,
  customLabel: "",
  paperWidthMm: 80,
  agentUrl: DEFAULT_PRINT_AGENT_URL,
  autoPrint: true,
  browserFallback: false,
});

/**
 * @returns {{
 *   presetId: string | null,
 *   customLabel: string,
 *   paperWidthMm: 58 | 80,
 *   agentUrl: string,
 *   autoPrint: boolean,
 *   browserFallback: boolean,
 * }}
 */
export function getOwnerPrintPreferences() {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs();
    const p = JSON.parse(raw);
    const paperWidthMm = p.paperWidthMm === 58 ? 58 : 80;
    const agentUrl =
      typeof p.agentUrl === "string" && p.agentUrl.trim()
        ? p.agentUrl.trim().replace(/\/+$/, "")
        : DEFAULT_PRINT_AGENT_URL;
    return {
      presetId: typeof p.presetId === "string" ? p.presetId : null,
      customLabel: typeof p.customLabel === "string" ? p.customLabel : "",
      paperWidthMm,
      agentUrl,
      autoPrint: p.autoPrint !== false,
      browserFallback: p.browserFallback === true,
    };
  } catch {
    return defaultPrefs();
  }
}

/**
 * @param {{
 *   presetId?: string | null,
 *   customLabel?: string,
 *   paperWidthMm?: 58 | 80,
 *   agentUrl?: string,
 *   autoPrint?: boolean,
 *   browserFallback?: boolean,
 * }} prefs
 */
export function setOwnerPrintPreferences(prefs) {
  if (typeof window === "undefined") return;
  try {
    const cur = getOwnerPrintPreferences();
    const nextAgent =
      prefs.agentUrl !== undefined
        ? String(prefs.agentUrl || "").trim().replace(/\/+$/, "") || DEFAULT_PRINT_AGENT_URL
        : cur.agentUrl;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        presetId: prefs.presetId !== undefined ? prefs.presetId : cur.presetId,
        customLabel: prefs.customLabel !== undefined ? prefs.customLabel : cur.customLabel,
        paperWidthMm:
          prefs.paperWidthMm === 58 || prefs.paperWidthMm === 80 ? prefs.paperWidthMm : cur.paperWidthMm,
        agentUrl: nextAgent,
        autoPrint: prefs.autoPrint !== undefined ? Boolean(prefs.autoPrint) : cur.autoPrint,
        browserFallback:
          prefs.browserFallback !== undefined ? Boolean(prefs.browserFallback) : cur.browserFallback,
      })
    );
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @param {{ presetId: string | null, customLabel: string }} prefs
 * @returns {string}
 */
export function getResolvedPrinterDisplayLabel(prefs) {
  const custom = (prefs.customLabel || "").trim();
  if (custom) return custom;
  const preset = RECEIPT_PRINTER_PRESETS.find((x) => x.id === prefs.presetId);
  return preset?.label ?? "";
}

/**
 * Receipt CSS dimensions from saved paper width.
 * @param {{ paperWidthMm: 58 | 80 }} prefs
 */
export function getReceiptLayoutMm(prefs) {
  const page = prefs.paperWidthMm === 58 ? 58 : 80;
  const body = page === 58 ? 52 : 72;
  return { pageMm: page, bodyMm: body };
}
