// Vite replaces these values with the current build's assets and cache key.
const CACHE = __CACHE_NAME__;
const FILES = __PRECACHE_FILES__;

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys
      .filter(key => key.startsWith('courtside-') && key !== CACHE)
      .map(key => caches.delete(key)),
  )));
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    return event.request.mode === 'navigate'
      ? caches.match('./index.html')
      : Response.error();
  }));
});
