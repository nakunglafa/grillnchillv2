/**
 * Local kitchen print agent.
 * Receives order JSON from the owner dashboard and prints ESC/POS to a network thermal printer.
 *
 * Env:
 *   PRINTER_HOST=192.168.8.199
 *   PRINTER_PORT=9100
 *   PORT=9101
 *   HOST=127.0.0.1
 *   RESTAURANT_NAME=Thai & Maki
 *   CORS_ORIGINS=http://localhost:3006,http://127.0.0.1:3006
 */

const http = require("http");
const net = require("net");
const { buildKitchenTicket, buildTestTicket } = require("./escpos");

const PRINTER_HOST = process.env.PRINTER_HOST || "192.168.8.199";
const PRINTER_PORT = Number(process.env.PRINTER_PORT || 9100);
const LISTEN_PORT = Number(process.env.PORT || 9101);
const LISTEN_HOST = process.env.HOST || "127.0.0.1";
const RESTAURANT_NAME = process.env.RESTAURANT_NAME || "Thai & Maki";
const CORS_ORIGINS = (process.env.CORS_ORIGINS ||
  "http://localhost:3006,http://127.0.0.1:3006,http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const PRINT_TIMEOUT_MS = Number(process.env.PRINT_TIMEOUT_MS || 15000);

/** @type {Promise<void>} */
let queueTail = Promise.resolve();

function enqueue(fn) {
  const run = queueTail.then(fn, fn);
  queueTail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function sendToPrinter(buffer) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host: PRINTER_HOST, port: PRINTER_PORT }, () => {
      socket.write(buffer, (err) => {
        if (err) {
          socket.destroy();
          reject(err);
          return;
        }
        socket.end();
      });
    });

    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`Printer timeout after ${PRINT_TIMEOUT_MS}ms (${PRINTER_HOST}:${PRINTER_PORT})`));
    }, PRINT_TIMEOUT_MS);

    socket.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    socket.on("close", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function setCors(req, res) {
  const origin = req.headers.origin || "";
  if (origin && (CORS_ORIGINS.includes("*") || CORS_ORIGINS.includes(origin))) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  } else if (!origin) {
    res.setHeader("Access-Control-Allow-Origin", "*");
  }
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    const max = 2 * 1024 * 1024;
    req.on("data", (chunk) => {
      size += chunk.length;
      if (size > max) {
        reject(new Error("Body too large"));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => {
      if (!chunks.length) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function sendJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer(async (req, res) => {
  setCors(req, res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${LISTEN_HOST}:${LISTEN_PORT}`);

  try {
    if (req.method === "GET" && url.pathname === "/health") {
      sendJson(res, 200, {
        ok: true,
        printer: { host: PRINTER_HOST, port: PRINTER_PORT },
        restaurantName: RESTAURANT_NAME,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/test") {
      await enqueue(async () => {
        const buf = buildTestTicket();
        await sendToPrinter(buf);
      });
      sendJson(res, 200, { ok: true, message: "Test ticket sent" });
      return;
    }

    if (req.method === "POST" && url.pathname === "/print") {
      const body = await readJsonBody(req);
      const order = body.order && typeof body.order === "object" ? body.order : body;
      if (!order || typeof order !== "object" || Array.isArray(order)) {
        sendJson(res, 400, { ok: false, error: "Expected order JSON object" });
        return;
      }
      await enqueue(async () => {
        const buf = buildKitchenTicket(order, { restaurantName: RESTAURANT_NAME });
        await sendToPrinter(buf);
      });
      const id = order.id ?? order.order_id ?? null;
      sendJson(res, 200, { ok: true, message: "Printed", orderId: id });
      return;
    }

    sendJson(res, 404, { ok: false, error: "Not found" });
  } catch (err) {
    const message = err?.message || String(err);
    console.error("[print-agent]", message);
    sendJson(res, 502, {
      ok: false,
      error: message,
      hint: `Check printer at ${PRINTER_HOST}:${PRINTER_PORT} is on and reachable from this PC`,
    });
  }
});

server.listen(LISTEN_PORT, LISTEN_HOST, () => {
  console.log(`[print-agent] Listening on http://${LISTEN_HOST}:${LISTEN_PORT}`);
  console.log(`[print-agent] Printer ${PRINTER_HOST}:${PRINTER_PORT}`);
  console.log(`[print-agent] CORS origins: ${CORS_ORIGINS.join(", ")}`);
  console.log("[print-agent] Keep this window open while using the owner dashboard.");
});
