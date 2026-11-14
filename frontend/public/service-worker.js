self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      if (clients.some((client) => client.visibilityState === 'visible')) return;

      const title =
        typeof payload.title === 'string' ? payload.title : 'Hello World';
      const body =
        typeof payload.body === 'string'
          ? payload.body
          : 'Vous avez une nouvelle notification.';
      const url =
        typeof payload.url === 'string' &&
        payload.url.startsWith('/') &&
        !payload.url.startsWith('//')
          ? payload.url
          : '/notifications';

      await self.registration.showNotification(title, {
        body,
        icon: '/favicon.svg',
        data: { url },
      });
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const path =
    typeof event.notification.data?.url === 'string' &&
    event.notification.data.url.startsWith('/') &&
    !event.notification.data.url.startsWith('//')
      ? event.notification.data.url
      : '/notifications';

  event.waitUntil(
    (async () => {
      const target = new URL(path, self.location.origin).href;
      const clients = await self.clients.matchAll({
        type: 'window',
        includeUncontrolled: true,
      });
      const existing = clients.find(
        (client) => new URL(client.url).origin === self.location.origin,
      );
      if (existing) {
        await existing.focus();
        await existing.navigate(target);
      } else {
        await self.clients.openWindow(target);
      }
    })(),
  );
});
