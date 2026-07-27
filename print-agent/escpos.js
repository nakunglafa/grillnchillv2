/**
 * Minimal ESC/POS helpers for 80mm thermal printers (Xprinter / Epson-compatible).
 */

const ESC = 0x1b;
const GS = 0x1d;

function text(s) {
  return Buffer.from(String(s ?? ""), "utf8");
}

function cmd(...bytes) {
  return Buffer.from(bytes);
}

/** Initialize printer */
function init() {
  return cmd(ESC, 0x40);
}

/** Align: 0 left, 1 center, 2 right */
function align(n) {
  return cmd(ESC, 0x61, n & 0xff);
}

/** Emphasized / bold */
function bold(on) {
  return cmd(ESC, 0x45, on ? 1 : 0);
}

/** Double width+height for headers */
function size(double) {
  return cmd(GS, 0x21, double ? 0x11 : 0x00);
}

function line(s = "") {
  return Buffer.concat([text(s), text("\n")]);
}

function hr() {
  return line("--------------------------------");
}

/** Partial cut (GS V 1) */
function cut() {
  return Buffer.concat([cmd(ESC, 0x64, 3), cmd(GS, 0x56, 1)]);
}

function getOrderId(detail) {
  if (!detail || typeof detail !== "object") return "—";
  const id =
    detail.id ??
    detail.order_id ??
    detail.table_order_id ??
    detail.data?.id ??
    detail.data?.order_id;
  return id != null && id !== "" ? String(id) : "—";
}

function getOrderTypeLabel(detail) {
  if (!detail || typeof detail !== "object") return "—";
  if (detail.order_type) return String(detail.order_type);
  const addr = detail.delivery_address;
  if (typeof addr === "string" && addr.toLowerCase().includes("pickup")) return "Pickup";
  return detail.delivery_address ? "Delivery" : "—";
}

function getPlacedAtText(detail) {
  const raw = detail?.placed_at ?? detail?.created_at ?? detail?.updated_at;
  if (!raw) return new Date().toLocaleString();
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? String(raw) : d.toLocaleString();
}

function coerceLineItemsArray(val) {
  if (Array.isArray(val)) return val;
  if (val && typeof val === "object") {
    const values = Object.values(val);
    if (values.length && values.every((v) => v && typeof v === "object")) return values;
  }
  return [];
}

function getOrderLineItems(order) {
  if (!order || typeof order !== "object") return [];
  const keys = [
    "items",
    "order_items",
    "orderItems",
    "lines",
    "line_items",
    "order_lines",
    "products",
    "cart_items",
  ];
  for (const k of keys) {
    const arr = coerceLineItemsArray(order[k]);
    if (arr.length) return arr;
  }
  const nested = order.data;
  if (nested && typeof nested === "object") {
    for (const k of keys) {
      const arr = coerceLineItemsArray(nested[k]);
      if (arr.length) return arr;
    }
  }
  return [];
}

function getLineItemDisplayName(line) {
  if (!line || typeof line !== "object") return "Item";
  return (
    line.item_name ??
    line.name ??
    line.menu_item_name ??
    line.product_name ??
    line.title ??
    line.dish_name ??
    line.menu_item?.name ??
    line.product?.name ??
    "Item"
  );
}

/**
 * Build ESC/POS buffer for a kitchen ticket from an order payload.
 * @param {Record<string, unknown>} detail
 * @param {{ restaurantName?: string }} [opts]
 */
function buildKitchenTicket(detail, opts = {}) {
  const siteName = (opts.restaurantName || process.env.RESTAURANT_NAME || "Thai & Maki").trim();
  const orderNo = getOrderId(detail);
  const placed = getPlacedAtText(detail);
  const type = getOrderTypeLabel(detail);
  const customer =
    detail.customer_name ?? detail.user?.name ?? detail.customer?.name ?? "—";
  const phone = detail.customer_phone ?? detail.phone ?? detail.user?.phone ?? "";
  const addr = detail.delivery_address ? String(detail.delivery_address) : "";
  const notes = [detail.delivery_instructions, detail.notes].filter(Boolean).join(" | ");
  const total = detail.total_amount != null ? String(detail.total_amount) : "";

  const parts = [
    init(),
    align(1),
    bold(true),
    size(true),
    line(siteName),
    size(false),
    bold(false),
    bold(true),
    line(`Order #${orderNo}`),
    bold(false),
    align(0),
    hr(),
    line(`Time: ${placed}`),
    line(`Type: ${type}`),
    line(`Customer: ${customer}`),
  ];

  if (phone) parts.push(line(`Phone: ${phone}`));
  if (addr) parts.push(line(`Address: ${addr}`));
  if (notes) parts.push(line(`Notes: ${notes}`));

  parts.push(hr());

  const lines = getOrderLineItems(detail);
  if (lines.length === 0) {
    parts.push(line("(No line items)"));
  } else {
    for (const row of lines) {
      const qty = Number(row.quantity) > 0 ? Number(row.quantity) : 1;
      const name = getLineItemDisplayName(row);
      parts.push(bold(true), line(`${qty}x ${name}`), bold(false));
    }
  }

  parts.push(hr());
  if (total) parts.push(bold(true), line(`Total: ${total}`), bold(false));
  parts.push(align(1), line(""), line("— Kitchen —"), line(""), cut());

  return Buffer.concat(parts);
}

function buildTestTicket() {
  return Buffer.concat([
    init(),
    align(1),
    bold(true),
    size(true),
    line("TEST PRINT"),
    size(false),
    bold(false),
    line("Thai & Maki print agent"),
    line(new Date().toLocaleString()),
    line(""),
    line("If you see this, ESC/POS works."),
    line(""),
    cut(),
  ]);
}

module.exports = {
  buildKitchenTicket,
  buildTestTicket,
};
