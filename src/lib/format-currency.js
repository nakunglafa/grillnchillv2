const EUR_LOCALE = "pt-PT";

const eurFormatter = new Intl.NumberFormat(EUR_LOCALE, {
  style: "currency",
  currency: "EUR",
});

function toNumber(value) {
  if (value == null || value === "") return null;
  const n = typeof value === "number" ? value : parseFloat(String(value).replace(/[^0-9.-]/g, ""));
  return Number.isNaN(n) ? null : n;
}

/** Missing / invalid → empty string (menu, home showcase). */
export function formatCurrencyEUR(value) {
  const n = toNumber(value);
  if (n == null) return "";
  return eurFormatter.format(n);
}

/** Missing / invalid → em dash (owner tools). */
export function formatCurrencyEUROrDash(value) {
  const n = toNumber(value);
  if (n == null) return "—";
  return eurFormatter.format(n);
}

/** Missing / invalid → €0,00 (cart, checkout, customer orders). */
export function formatCurrencyEURZero(value) {
  const n = toNumber(value);
  return eurFormatter.format(n == null ? 0 : n);
}
