const STORAGE_KEY = "owner:receipt-print:v1";

/** Common receipt printers (searchable). Width is typical paper width for layout only — not OS binding. */
export const RECEIPT_PRINTER_PRESETS = [
  { id: "epson-tm-m30iii", label: "Epson TM-m30III", widthMm: 80 },
  { id: "epson-tm-m30ii", label: "Epson TM-m30II", widthMm: 80 },
  { id: "epson-tm-t20iii", label: "Epson TM-T20III", widthMm: 80 },
  { id: "epson-tm-t82iii", label: "Epson TM-T82III", widthMm: 80 },
  { id: "star-tsp143iii", label: "Star TSP143III", widthMm: 80 },
  { id: "star-mc-print3", label: "Star mC-Print3", widthMm: 80 },
  { id: "bixolon-srp350iii", label: "Bixolon SRP-350III", widthMm: 80 },
  { id: "generic-thermal-80", label: "Generic thermal 80 mm", widthMm: 80 },
  { id: "generic-thermal-58", label: "Generic thermal 58 mm", widthMm: 58 },
];

const defaultPrefs = () => ({
  presetId: null,
  customLabel: "",
  paperWidthMm: 80,
});

/**
 * @returns {{ presetId: string | null, customLabel: string, paperWidthMm: 58 | 80 }}
 */
export function getOwnerPrintPreferences() {
  if (typeof window === "undefined") return defaultPrefs();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPrefs();
    const p = JSON.parse(raw);
    const paperWidthMm = p.paperWidthMm === 58 ? 58 : 80;
    return {
      presetId: typeof p.presetId === "string" ? p.presetId : null,
      customLabel: typeof p.customLabel === "string" ? p.customLabel : "",
      paperWidthMm,
    };
  } catch {
    return defaultPrefs();
  }
}

/**
 * @param {{ presetId?: string | null, customLabel?: string, paperWidthMm?: 58 | 80 }} prefs
 */
export function setOwnerPrintPreferences(prefs) {
  if (typeof window === "undefined") return;
  try {
    const cur = getOwnerPrintPreferences();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        presetId: prefs.presetId !== undefined ? prefs.presetId : cur.presetId,
        customLabel: prefs.customLabel !== undefined ? prefs.customLabel : cur.customLabel,
        paperWidthMm:
          prefs.paperWidthMm === 58 || prefs.paperWidthMm === 80 ? prefs.paperWidthMm : cur.paperWidthMm,
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
