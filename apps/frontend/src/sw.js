// Service worker dedicado a Web Push. Sem handler de fetch e sem caches de
// propósito: o problema histórico de build "presa" (FINK) veio do precache do
// Workbox — sem cache nenhum, toda navegação vai direto à rede como uma página
// comum, e o SW só existe para receber push e abrir o app ao clicar.
// (Fonte em JS puro para o output ser exatamente /sw.js, registrado no main.ts.)

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  let data = { title: 'TodoAPP', body: '', url: '/' };
  try {
    data = { ...data, ...event.data?.json() };
  } catch {
    /* payload não-JSON — usa defaults */
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo/pwa-192x192.png',
      badge: '/logo/pwa-192x192.png',
      data: { url: data.url },
      tag: `todoapp-${Date.now()}`,
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';

  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      for (const client of windows) {
        if ('focus' in client) {
          await client.focus();
          return;
        }
      }
      await self.clients.openWindow(url);
    })()
  );
});
