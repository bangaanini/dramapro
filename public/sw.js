self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Keep requests on the normal network path while enabling PWA installability.
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {
      body: event.data ? event.data.text() : "",
      title: "Layar Drama",
    };
  }

  const title = payload.title || "Layar Drama";
  const options = {
    badge: "/favicon_io/favicon-32x32.png",
    body: payload.body || "Ada update baru untuk kamu.",
    data: {
      campaignId: payload.data?.campaignId || "",
      targetUrl: payload.data?.targetUrl || "/",
      type: payload.data?.type || "custom",
    },
    icon: payload.icon || "/favicon_io/android-chrome-192x192.png",
    image: payload.image || undefined,
    tag: payload.tag || "dramapro-notification",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const rawTargetUrl = event.notification.data?.targetUrl || "/";
  const targetUrl = new URL(rawTargetUrl, self.location.origin).toString();

  event.waitUntil(
    self.clients
      .matchAll({
        includeUncontrolled: true,
        type: "window",
      })
      .then((clientList) => {
        for (const client of clientList) {
          const clientUrl = new URL(client.url);

          if (clientUrl.origin === self.location.origin && "focus" in client) {
            if (clientUrl.href !== targetUrl && "navigate" in client) {
              return client.navigate(targetUrl).then((navigatedClient) => {
                return navigatedClient?.focus();
              });
            }

            return client.focus();
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }

        return undefined;
      }),
  );
});
