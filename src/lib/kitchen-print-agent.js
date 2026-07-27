import { getOwnerPrintPreferences } from "@/lib/owner-print-preferences";

const DEFAULT_AGENT_URL = "http://127.0.0.1:9101";

/** @type {Set<string>} */
const autoPrintedOrderIds = new Set();

export function getKitchenPrintAgentUrl() {
  const prefs = getOwnerPrintPreferences();
  const url = (prefs.agentUrl || DEFAULT_AGENT_URL).trim().replace(/\/+$/, "");
  return url || DEFAULT_AGENT_URL;
}

function agentErrorMessage(status, data) {
  if (data?.error) return String(data.error);
  if (data?.hint) return String(data.hint);
  return `Print agent error (${status}). Start the print agent on this PC (print-agent folder).`;
}

/**
 * @param {string} path
 * @param {RequestInit} [init]
 */
async function agentFetch(path, init) {
  const base = getKitchenPrintAgentUrl();
  let res;
  try {
    res = await fetch(`${base}${path}`, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.body ? { "Content-Type": "application/json" } : {}),
        ...init?.headers,
      },
    });
  } catch {
    throw new Error(
      `Cannot reach print agent at ${base}. Start it on this PC: cd print-agent && npm start`
    );
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok || data?.ok === false) {
    throw new Error(agentErrorMessage(res.status, data));
  }
  return data;
}

export async function checkPrintAgentHealth() {
  return agentFetch("/health", { method: "GET" });
}

export async function testPrintAgent() {
  return agentFetch("/test", { method: "POST", body: "{}" });
}

/**
 * Send order to local print agent for ESC/POS kitchen ticket.
 * @param {Record<string, unknown>} detail
 */
export async function printViaAgent(detail) {
  if (!detail || typeof detail !== "object") {
    throw new Error("No order to print");
  }
  return agentFetch("/print", {
    method: "POST",
    body: JSON.stringify({ order: detail }),
  });
}

function getOrderIdForDedupe(detail) {
  if (!detail || typeof detail !== "object") return null;
  const id =
    detail.id ??
    detail.order_id ??
    detail.table_order_id ??
    detail.data?.id ??
    detail.data?.order_id;
  if (id == null || id === "") return null;
  return String(id);
}

/**
 * Auto-print once per order id when prefs.autoPrint is enabled.
 * @param {Record<string, unknown>} detail
 * @returns {Promise<{ skipped?: boolean, ok?: boolean, error?: string }>}
 */
export async function autoPrintNewOrderIfEnabled(detail) {
  if (typeof window === "undefined") return { skipped: true };
  const prefs = getOwnerPrintPreferences();
  if (!prefs.autoPrint) return { skipped: true };

  const id = getOrderIdForDedupe(detail);
  if (id) {
    if (autoPrintedOrderIds.has(id)) return { skipped: true };
    autoPrintedOrderIds.add(id);
  }

  try {
    await printViaAgent(detail);
    return { ok: true };
  } catch (err) {
    const message = err?.message || String(err);
    console.error("[kitchen-print]", message);
    return { ok: false, error: message };
  }
}
