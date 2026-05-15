/* eslint-disable no-undef */
/**
 * App service worker (PWA + owner notifications).
 * - install/activate: fast takeover so updates and install prompts behave predictably.
 * - push: Web Push from the API (optional).
 * - showNotification: from the app when orders/reservations arrive.
 */
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let title = "Thai n Maki";
  let body = "New order or reservation";
  let tag = "owner-push";
  /** @type {Record<string, unknown>} */
  let data = { url: "/owner" };

  if (event.data) {
    try {
      const json = event.data.json();
      if (json && typeof json === "object") {
        if (json.title) title = String(json.title);
        if (json.body) body = String(json.body);
        if (json.tag) tag = String(json.tag);
        if (json.url) data = { ...data, url: String(json.url) };
        if (json.data && typeof json.data === "object") data = { ...data, ...json.data };
      }
    } catch {
      const t = event.data.text();
      if (t) body = t;
    }
  }

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      data,
    })
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
