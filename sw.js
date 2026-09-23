// Offline support. App files are fetched fresh when online (so updates show up
// on the next open) and fall back to the cached copy when offline. Posters are
// cached after first view. TVmaze searches always go to the network.
const SHELL_CACHE = 'series-shell-v20';
const IMAGE_CACHE = 'series-images-v1';
const SHELL = ['./', 'index.html', 'styles.css', 'app.js', 'manifest.webmanifest', 'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/favicon-32.png'];

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's HTTP cache so a new version never caches old files.
  e.waitUntil(
    caches.open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => ![SHELL_CACHE, IMAGE_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.hostname === 'api.tvmaze.com') return; // live search only

  if (url.hostname === 'static.tvmaze.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(IMAGE_CACHE).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
        return res;
      })
    );
    return;
  }

  if (url.origin === self.location.origin || url.hostname === 'fonts.googleapis.com') {
    // Network first (revalidated, so no stale HTTP-cache copy), cache as the offline fallback.
    e.respondWith(
      caches.open(SHELL_CACHE).then(async (cache) => {
        try {
          const res = await fetch(req, { cache: 'no-cache' });
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch (err) {
          const hit = await cache.match(req, { ignoreSearch: true });
          if (hit) return hit;
          throw err;
        }
      })
    );
  }
});
