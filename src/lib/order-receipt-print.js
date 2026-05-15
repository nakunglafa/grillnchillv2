import { getOrderLineItems, getLineItemDisplayName, getLineItemRowTotal } from "@/lib/owner-utils";
import { formatCurrencyEUR } from "@/lib/format-currency";
import {
  getOwnerPrintPreferences,
  getResolvedPrinterDisplayLabel,
  getReceiptLayoutMm,
} from "@/lib/owner-print-preferences";

function escapeHtml(s) {
  if (s == null) return "";
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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

/**
 * Receipt HTML only — print is triggered from the parent/hidden iframe (no inline script;
 * avoids CSP / noopener issues with window.open).
 */
function buildReceiptHtmlDocument(detail) {
  const printPrefs =
    typeof window !== "undefined" ? getOwnerPrintPreferences() : { paperWidthMm: 80, presetId: null, customLabel: "" };
  const { pageMm, bodyMm } = getReceiptLayoutMm(printPrefs);
  const printerReminder = getResolvedPrinterDisplayLabel(printPrefs);

  const siteName = (process.env.NEXT_PUBLIC_RESTAURANT_NAME || "Restaurant").trim();
  const venueRaw =
    (detail.restaurant_name && String(detail.restaurant_name).trim()) ||
    (detail.restaurant?.name && String(detail.restaurant.name).trim()) ||
    "";
  const showVenue = venueRaw.length > 0 && venueRaw.toLowerCase() !== siteName.toLowerCase();
  const orderNo = getOrderId(detail);
  const placed = getPlacedAtText(detail);
  const customer =
    detail.customer_name ?? detail.user?.name ?? detail.customer?.name ?? "—";
  const phone = detail.customer_phone ?? detail.phone ?? detail.user?.phone ?? "";
  const type = getOrderTypeLabel(detail);
  const total = formatCurrencyEUR(detail.total_amount) || "—";
  const addr = detail.delivery_address ? String(detail.delivery_address) : "";
  const notes = [detail.delivery_instructions, detail.notes].filter(Boolean).join(" • ");

  const lines = getOrderLineItems(detail);
  const lineRows = lines.map((line) => {
    const name = getLineItemDisplayName(line);
    const qty = Number(line.quantity) > 0 ? Number(line.quantity) : 1;
    const rowTot = getLineItemRowTotal(line);
    const price = rowTot != null ? formatCurrencyEUR(rowTot) : "";
    return { name, qty, price };
  });

  const itemBlock = lineRows.length
    ? lineRows
        .map((r) => {
          const left = `${r.qty}× ${r.name}`;
          const right = r.price || "";
          return `<tr><td class="name">${escapeHtml(left)}</td><td class="amt">${escapeHtml(right)}</td></tr>`;
        })
        .join("")
    : `<tr><td colspan="2" class="muted">(No line items)</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Order #${escapeHtml(orderNo)}</title>
<style>
  @page { size: ${pageMm}mm auto; margin: 3mm; }
  * { box-sizing: border-box; }
  body {
    font-family: ui-monospace, "Cascadia Code", "Courier New", monospace;
    font-size: 11px;
    line-height: 1.35;
    color: #000;
    width: ${bodyMm}mm;
    max-width: ${bodyMm}mm;
    margin: 0 auto;
    padding: 2mm 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  h1 {
    font-size: 17px;
    margin: 0 0 6px 0;
    text-align: center;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    line-height: 1.15;
  }
  .venue {
    text-align: center;
    font-size: 10px;
    font-weight: 600;
    margin: 0 0 4px 0;
    color: #222;
  }
  .order-ref {
    text-align: center;
    font-size: 10px;
    font-weight: 600;
    margin: 0 0 10px 0;
    letter-spacing: 0.02em;
  }
  .hr { border: none; border-top: 1px dashed #000; margin: 6px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; padding: 2px 0; }
  td.name { padding-right: 4px; word-break: break-word; }
  td.amt { text-align: right; white-space: nowrap; width: 22%; }
  .kv { margin: 3px 0; }
  .k { font-weight: 700; }
  .total { margin-top: 8px; font-size: 12px; font-weight: 800; text-align: right; }
  .muted { color: #333; font-style: italic; }
  .footer {
    text-align: center;
    font-size: 10px;
    margin: 10px 0 0 0;
    color: #444;
  }
  .printer-station {
    text-align: center;
    font-size: 9px;
    margin: 12px 0 0 0;
    color: #444;
    font-weight: 600;
  }
  @media print {
    body { padding: 0; }
  }
</style>
</head>
<body>
  <h1>${escapeHtml(siteName)}</h1>
  ${showVenue ? `<p class="venue">${escapeHtml(venueRaw)}</p>` : ""}
  <p class="order-ref">Order #${escapeHtml(orderNo)}</p>
  <div class="hr"></div>
  <div class="kv"><span class="k">Time:</span> ${escapeHtml(placed)}</div>
  <div class="kv"><span class="k">Type:</span> ${escapeHtml(type)}</div>
  <div class="kv"><span class="k">Customer:</span> ${escapeHtml(customer)}</div>
  ${phone ? `<div class="kv"><span class="k">Phone:</span> ${escapeHtml(phone)}</div>` : ""}
  ${addr ? `<div class="kv"><span class="k">Address:</span> ${escapeHtml(addr)}</div>` : ""}
  ${notes ? `<div class="kv"><span class="k">Notes:</span> ${escapeHtml(notes)}</div>` : ""}
  <div class="hr"></div>
  <table>${itemBlock}</table>
  <div class="hr"></div>
  <div class="total">Total: ${escapeHtml(total)}</div>
  ${printerReminder ? `<p class="printer-station">Print: ${escapeHtml(printerReminder)}</p>` : ""}
  <p class="footer muted">— Thank you —</p>
</body>
</html>`;
}

function printViaHiddenIframe(html) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.setAttribute("title", "Print receipt");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "1px",
    height: "1px",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    return false;
  }

  doc.open();
  doc.write(html);
  doc.close();

  const trigger = () => {
    try {
      win.focus();
      win.print();
    } catch (_) {
      /* ignore */
    } finally {
      setTimeout(() => {
        try {
          iframe.remove();
        } catch (_) {
          /* ignore */
        }
      }, 800);
    }
  };

  setTimeout(trigger, 150);
  return true;
}

/** Fallback: must not use noopener — that returns null in many browsers while still opening a blank tab. */
function printViaPopup(html) {
  const w = window.open("about:blank", "_blank", "width=480,height=720");
  if (!w) return false;
  try {
    w.document.open();
    w.document.write(html);
    w.document.close();
  } catch (_) {
    try {
      w.close();
    } catch (__) {
      /* ignore */
    }
    return false;
  }
  const run = () => {
    try {
      w.focus();
      w.print();
    } catch (_) {
      /* ignore */
    }
  };
  setTimeout(run, 200);
  setTimeout(() => {
    try {
      w.close();
    } catch (_) {
      /* ignore */
    }
  }, 1000);
  return true;
}

/**
 * ~80mm thermal receipt. Uses a hidden iframe first (reliable; no blank tab).
 *
 * @param {Record<string, unknown>} detail - Same order payload as LiveNotificationToast `detail`.
 */
export function printOrderKitchenReceipt(detail) {
  if (typeof window === "undefined" || !detail) return;

  const html = buildReceiptHtmlDocument(detail);
  if (typeof document === "undefined") return;

  if (printViaHiddenIframe(html)) return;
  printViaPopup(html);
}
