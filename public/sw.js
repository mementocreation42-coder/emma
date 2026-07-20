self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "今週の予定", {
      body: data.body || "予定を確認しましょう",
      icon: "/favicon-flat.png",
      badge: "/favicon-flat.png",
      data: { url: data.url || "/schedule" },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || "/schedule"));
});
