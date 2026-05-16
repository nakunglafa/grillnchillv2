/* eslint-disable no-undef */
/**
 * App service worker (PWA + owner notifications).
 * - install/activate: fast takeover so updates and install prompts behave predictably.
 * - push: Web Push from the API (Laravel) — body is usually decrypted JSON text.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * @param {unknown} raw
 * @returns {{ title: string; body: string; tag: string; data: Record<string, unknown> }}
 */
function pickPushContent(raw) {
  let title = "Thai n Maki";
  let body = "New order or reservation";
  let tag = "owner-push";
  /** @type {Record<string, unknown>} */
  let data = { url: "/owner" };

  const apply = (obj) => {
    if (!obj || typeof obj !== "object") return;
    const o = /** @type {Record<string, unknown>} */ (obj);

    if (typeof o.title === "string") title = o.title;
    if (typeof o.body === "string") body = o.body;
    if (typeof o.tag === "string") tag = o.tag;

    const n = o.notification;
    if (n && typeof n === "object") {
      const nt = /** @type {Record<string, unknown>} */ (n);
      if (typeof nt.title === "string") title = nt.title;
      if (typeof nt.body === "string") body = nt.body;
    }

    if (typeof o.url === "string" && o.url.startsWith("/")) {
      data = { ...data, url: o.url };
    }

    const d = o.data;
    if (typeof d === "string") {
      try {
        const inner = JSON.parse(d);
        if (inner && typeof inner === "object") apply(inner);
      } catch {
        /* ignore */
      }
    } else if (d && typeof d === "object") {
      const dd = /** @type {Record<string, unknown>} */ (d);
      if (typeof dd.url === "string" && dd.url.startsWith("/")) data = { ...data, url: dd.url };
      Object.assign(data, dd);
    }
  };

  apply(raw);
  return { title, body, tag, data };
}

function showPickedNotification(picked) {
  return self.registration.showNotification(picked.title, {
    body: picked.body,
    tag: picked.tag,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    data: picked.data,
    requireInteraction: true,
    vibrate: [200, 80, 200, 80, 200],
  });
}

self.addEventListener("push", (event) => {
  const fallbackPicked = () => ({
    title: "Thai n Maki",
    body: "New order or reservation",
    tag: "owner-push",
    data: { url: "/owner" },
  });

  if (!event.data) {
    event.waitUntil(showPickedNotification(fallbackPicked()));
    return;
  }

  event.waitUntil(
    (async () => {
      try {
        const text = await event.data.text();
        if (!text || !String(text).trim()) {
          await showPickedNotification(fallbackPicked());
          return;
        }
        let picked;
        try {
          const parsed = JSON.parse(text);
          picked = pickPushContent(parsed);
        } catch {
          const b = String(text);
          picked = {
            title: "Thai n Maki",
            body: b.length > 180 ? `${b.slice(0, 177)}…` : b,
            tag: "owner-push",
            data: { url: "/owner" },
          };
        }
        await showPickedNotification(picked);
      } catch {
        await showPickedNotification(fallbackPicked());
      }
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const raw = event.notification.data && event.notification.data.url;
  const path = typeof raw === "string" && raw.startsWith("/") ? raw : "/owner";
  const urlToOpen = new URL(path, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (!client.url.startsWith(self.location.origin)) continue;
        if (client.url === urlToOpen || client.url.split("#")[0] === urlToOpen) {
          return client.focus();
        }
      }
      for (const client of clientList) {
        if (!client.url.startsWith(self.location.origin)) continue;
        if ("navigate" in client && typeof client.navigate === "function") {
          return client.navigate(urlToOpen).then(() => client.focus());
        }
        return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(urlToOpen);
    })
  );
});
