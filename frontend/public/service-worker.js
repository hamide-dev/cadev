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

      // Photo de la personne si elle en a une (https uniquement), sinon le logo de l'app.
      const icon =
        typeof payload.icon === 'string' && payload.icon.startsWith('https://')
          ? payload.icon
          : '/icon-192.png';
      const tag = typeof payload.tag === 'string' ? payload.tag : undefined;

      await self.registration.showNotification(title, {
        body,
        icon,
        badge: '/badge-96.png', // silhouette blanche dans la barre d'état Android
        tag, // une seule notification par conversation ou publication, mise à jour
        renotify: Boolean(tag), // …mais le téléphone vibre quand même à chaque nouveauté
        vibrate: [80, 40, 80],
        timestamp: Date.now(),
        lang: 'fr',
        data: { url },
      });

      // Pastille sur l'icône de l'app installée (iOS 16.4+, Android, ordinateur).
      if ('setAppBadge' in self.navigator) {
        const shown = await self.registration.getNotifications();
        await self.navigator.setAppBadge(shown.length).catch(() => undefined);
      }
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if ('clearAppBadge' in self.navigator) self.navigator.clearAppBadge().catch(() => undefined);
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
