const CACHE = 'ef-v2';
const ASSETS = ['./', 'index.html', 'flow-experience.css', 'flow-experience.js', 'manifest.json', 'icon-192.png', 'icon.png'];
const allowed = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.delete('ef-v1').then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || !allowed.has(req.url) && req.mode !== 'navigate') return;
  if (!req.url.startsWith(self.registration.scope)) return;
  const network = fetch(req);
  if (allowed.has(req.url)) {
    event.waitUntil(network.then(response => {
      if (!response.ok) return;
      const copy = response.clone();
      return caches.open(CACHE).then(cache => cache.put(req, copy));
    }).catch(() => {}));
  }
  event.respondWith(network.catch(async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    if (cached) return cached;
    return (req.mode === 'navigate' && await cache.match('./')) || Response.error();
  }));
});
