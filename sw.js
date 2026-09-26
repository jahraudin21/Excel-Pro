const CACHE_NAME = 'excel-pro-v1';

/* Same-origin files the app needs to boot offline. Kept in sync with the
   <link>/<script> tags in index.html. */
const STATIC_ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/account.js',
  './js/drive.js',
  './js/script.js',
  './js/drawDesign.js',
  './js/account-ui.js',
  './js/auth-guard.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      /* Add one-by-one so a single missing/renamed asset cannot abort install. */
      .then(cache => Promise.all(
        STATIC_ASSETS.map(url =>
          cache.add(new Request(url, { cache: 'reload' }))
            .catch(err => console.warn('[sw] precache skipped', url, err))
        )
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    }).then(() => self.clients.claim())
  );
});

function isCacheable(response) {
  return !!response &&
    response.status === 200 &&
    response.type === 'basic' &&
    response.headers.get('cache-control') !== 'no-store';
}

self.addEventListener('fetch', event => {
  const req = event.request;

  /* Only GET, and only our own origin: cross-origin traffic (Google Sign-In
     script, Drive API) must always hit the network. */
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;

  /* Navigations: network-first, fall back to the cached shell when offline. */
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          if (isCacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match('./index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  /* Everything else: cache-first (stale-while-revalidate) for instant loads. */
  event.respondWith(
    caches.match(req).then(cached => {
      const fromNetwork = fetch(req)
        .then(res => {
          if (isCacheable(res)) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || fromNetwork;
    })
  );
});