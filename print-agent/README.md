# Thai & Maki — kitchen print agent

Small local service that receives print jobs from the owner dashboard and sends **ESC/POS** tickets to a network thermal printer (e.g. Xprinter XP-K260L).

Browsers cannot talk to printer IPs directly. Run this agent on a PC that is on the **same LAN** as the printer.

## Defaults

| Setting | Default |
|---------|---------|
| Agent URL | `http://127.0.0.1:9101` |
| Printer | `192.168.8.199:9100` |

## Setup

```bash
cd print-agent
npm start
```

Optional environment variables:

```bash
set PRINTER_HOST=192.168.8.199
set PRINTER_PORT=9100
set PORT=9101
set HOST=127.0.0.1
set RESTAURANT_NAME=Thai & Maki
set CORS_ORIGINS=http://localhost:3006,https://your-production-domain.com
npm start
```

## Endpoints

- `GET /health` — agent status
- `POST /print` — body: order JSON (same shape as dashboard order)
- `POST /test` — short test ticket

## Dashboard

1. Open the owner **Settings** → receipt / kitchen print section.
2. Confirm agent URL is `http://127.0.0.1:9101`.
3. Click **Test print**.
4. Leave auto-print enabled so new orders print automatically.
5. Use **Reprint** on an order card or toast to print again.

## Ops tips

- Keep the agent window (or Windows service) running on the POS PC during service hours.
- If print fails: check printer power, LAN cable/Wi‑Fi, and that this PC can ping `192.168.8.199`.
- Firewall: allow Node inbound on port `9101` only if you change `HOST` away from `127.0.0.1`.
