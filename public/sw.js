// Service worker: shows push notifications and opens the task when one is tapped. It doesn't cache anything.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("push", (e) => {
  const msg = e.data ? e.data.json() : {};
  e.waitUntil(
    self.registration.showNotification(msg.title || "SNF Dailies", {
      body: msg.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: msg.tag,
      data: { url: msg.url || "/" },
    }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || "/", self.location.origin).href;
  e.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(async (open) => {
      const win = open.find((c) => c.url.startsWith(self.location.origin));
      if (win) {
        await win.focus();
        return win.navigate(url).catch(() => self.clients.openWindow(url));
      }
      return self.clients.openWindow(url);
    }),
  );
});
