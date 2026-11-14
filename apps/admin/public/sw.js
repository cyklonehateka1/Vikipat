const CACHE_NAME = 'vikipat-admin-shell-v1';
const SHELL_URL = '/';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const response = await fetch(SHELL_URL, { cache: 'reload' });
      if (!response.ok) return;
      await cache.put(SHELL_URL, response.clone());
      const html = await response.clone().text();
      const hrefs = Array.from(html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css))"/g)).map((m) => m[1]);
      await Promise.all(
        hrefs.map(async (url) => {
          try {
            const assetResponse = await fetch(url, { cache: 'reload' });
            if (assetResponse.ok) await cache.put(url, assetResponse);
          } catch {
            // ignore assets that fail to fetch during install
          }
        })
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok && !response.redirected) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(SHELL_URL, response.clone());
          }
          return response;
        } catch {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(SHELL_URL);
          if (cached) return cached;
          throw new Error('offline and no cached shell');
        }
      })()
    );
    return;
  }

  if (/\.(?:js|css)$/.test(url.pathname)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      })()
    );
  }
});
