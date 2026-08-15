const HEX_RE = /^#([0-9a-fA-F]{6})$/;

/** Grill N Chill public defaults (dark wood) — owner dashboard tokens stay separate. */
export const DEFAULT_PUBLIC_THEME = {
  accent: "#c59d5f",
  background: "#241e19",
  foreground: "#f5f0e8",
  fontPair: "playfair-montserrat",
};

export const FONT_PAIRS = [
  {
    id: "playfair-montserrat",
    label: "Playfair + Montserrat",
    heading: "var(--font-playfair)",
    body: "var(--font-montserrat)",
  },
  {
    id: "lora-inter",
    label: "Lora + Inter",
    heading: "var(--font-lora)",
    body: "var(--font-inter)",
  },
  {
    id: "outfit-inter",
    label: "Outfit + Inter",
    heading: "var(--font-outfit)",
    body: "var(--font-inter)",
  },
];

export function isHexColor(value) {
  return HEX_RE.test(String(value || "").trim());
}

function normalizeHex(value, fallback) {
  const raw = String(value || "").trim();
  if (isHexColor(raw)) return raw.toLowerCase();
  return fallback;
}

export function getFontPair(id) {
  return FONT_PAIRS.find((p) => p.id === id) || FONT_PAIRS[0];
}

/**
 * Resolve public-site theme from website_content, then env, then defaults.
 * @param {Record<string, unknown> | null | undefined} content
 */
export function resolvePublicTheme(content) {
  const c = content && typeof content === "object" ? content : {};
  const fontPairId = String(
    c.theme_font_pair || c.themeFontPair || process.env.NEXT_PUBLIC_THEME_FONT_PAIR || DEFAULT_PUBLIC_THEME.fontPair
  ).trim();

  return {
    accent: normalizeHex(
      c.theme_accent || c.themeAccent || process.env.NEXT_PUBLIC_THEME_ACCENT,
      DEFAULT_PUBLIC_THEME.accent
    ),
    background: normalizeHex(
      c.theme_background || c.themeBackground || process.env.NEXT_PUBLIC_THEME_BACKGROUND,
      DEFAULT_PUBLIC_THEME.background
    ),
    foreground: normalizeHex(
      c.theme_foreground || c.themeForeground || process.env.NEXT_PUBLIC_THEME_FOREGROUND,
      DEFAULT_PUBLIC_THEME.foreground
    ),
    fontPair: getFontPair(fontPairId).id,
  };
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex({ r, g, b }) {
  const h = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

export function darkenHex(hex, amount = 0.12) {
  if (!isHexColor(hex)) return hex;
  const { r, g, b } = hexToRgb(hex);
  const f = 1 - amount;
  return rgbToHex({ r: r * f, g: g * f, b: b * f });
}

/** Inline CSS variables for the public site (owner dashboard tokens are unchanged). */
export function publicThemeToCssVars(theme) {
  const t = theme || DEFAULT_PUBLIC_THEME;
  const pair = getFontPair(t.fontPair);
  return {
    "--accent": t.accent,
    "--accent-hover": darkenHex(t.accent, 0.12),
    "--background": t.background,
    "--foreground": t.foreground,
    "--wood-50": t.background,
    "--wood-100": t.background,
    "--wood-800": t.foreground,
    "--wood-900": t.foreground,
    "--wood-950": t.foreground,
    "--sovy-ink": t.foreground,
    "--sovy-cream": t.background,
    "--theme-heading-font": pair.heading,
    "--theme-body-font": pair.body,
    "--font-inter": '"Inter", "Helvetica Neue", Helvetica, Arial, sans-serif',
    "--font-lora": '"Lora", Georgia, "Times New Roman", serif',
    "--font-outfit": '"Outfit", "Helvetica Neue", Helvetica, Arial, sans-serif',
  };
}

export function cssVarsToStyle(vars) {
  return Object.entries(vars)
    .map(([k, v]) => `${k}: ${v}`)
    .join("; ");
}
