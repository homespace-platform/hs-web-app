self.addEventListener("push", (event) => {
  // The server sends a generic signal so a shared browser never exposes another account's content.
  event.waitUntil((async () => {
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    tabs.forEach((tab) => tab.postMessage({ event: "notifications.changed" }));
    if (tabs.some((tab) => tab.visibilityState === "visible" || tab.focused)) return;
    await self.registration.showNotification("HomeSpace", {
      body: "Bạn có thông báo mới.",
      icon: "/favicon_io/android-chrome-192x192.png",
      tag: "homespace-notification",
      data: { path: "/notifications" },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL("/notifications", self.location.origin);
    const tabs = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const tab = tabs.find((client) => new URL(client.url).origin === url.origin);
    if (tab) {
      await tab.navigate(url.href);
      await tab.focus();
    } else {
      await self.clients.openWindow(url.href);
    }
  })());
});
