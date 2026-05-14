/**
 * Owner dashboard utilities.
 * Role check: backend may return role as string, object, or role_id.
 */

export function isOwner(user) {
  if (!user) return false;
  const role = user.role ?? user.role_name ?? user.role?.name;
  const roleStr =
    typeof role === "string"
      ? role.toLowerCase()
      : (role?.slug ?? role?.name ?? role?.id ?? "").toString().toLowerCase().replace(/\s+/g, "-");
  const roleId = user.role_id ?? user.role?.id;
  return (
    roleStr === "restaurant-owner" ||
    roleStr === "restaurant_owner" ||
    roleStr === "super-admin" ||
    roleStr === "super_admin" ||
    roleStr.includes("owner") ||
    roleStr.includes("admin") ||
    roleId === 2 || // common owner role_id
    roleId === 1    // common super-admin role_id
  );
}

/**
 * Normalize API response to array.
 * Laravel often returns: { data: [...] }, { data: { data: [...] } }, { data: { reservations: [...] } }
 */
export function toArray(raw) {
  const d = raw?.data ?? raw;
  if (Array.isArray(d)) return d;
  if (Array.isArray(d?.data)) return d.data;
  if (Array.isArray(d?.restaurants)) return d.restaurants;
  if (Array.isArray(raw?.restaurants)) return raw.restaurants;
  if (Array.isArray(d?.reservations)) return d.reservations;
  if (Array.isArray(d?.orders)) return d.orders;
  if (Array.isArray(d?.menus)) return d.menus;
  if (Array.isArray(d?.tables)) return d.tables;
  if (Array.isArray(d?.categories)) return d.categories;
  if (Array.isArray(d?.items)) return d.items;
  // Paginated: { data: { orders: { data: [...] } } } or raw.orders?.data
  const orders = raw?.orders ?? d?.orders;
  if (Array.isArray(orders?.data)) return orders.data;
  return [];
}

function coerceLineItemsArray(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === "string" && val.trim().startsWith("[")) {
    try {
      const parsed = JSON.parse(val);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      /* ignore */
    }
  }
  if (val && typeof val === "object") {
    const vals = Object.values(val);
    if (vals.length && vals.every((v) => v != null && typeof v === "object")) return vals;
  }
  return [];
}

/**
 * Line items for an order (Laravel / REST often use `order_items` instead of `items`).
 * @param {Record<string, unknown>} order
 * @returns {unknown[]}
 */
export function getOrderLineItems(order) {
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

/** Display name for one order line (varies by API). */
export function getLineItemDisplayName(line) {
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

/** Best-effort line total for display (API may send total_price, or unit × qty). */
export function getLineItemRowTotal(line) {
  if (!line || typeof line !== "object") return null;
  const direct =
    line.total_price ?? line.line_total ?? line.subtotal ?? line.total ?? line.amount;
  if (direct != null && direct !== "") {
    const n = typeof direct === "number" ? direct : parseFloat(String(direct).replace(/[^0-9.-]/g, ""));
    if (Number.isFinite(n)) return n;
  }
  const unit = parseFloat(
    String(line.item_price ?? line.unit_price ?? line.price ?? line.menu_item?.price ?? "").replace(
      /[^0-9.-]/g,
      ""
    )
  );
  const qty = Number(line.quantity) || 1;
  if (Number.isFinite(unit)) return unit * qty;
  return null;
}
