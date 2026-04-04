/* ── Monetrax Service Worker ── */
const CACHE_NAME = 'monetrax-v2';

/* All assets to pre-cache on install */
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-48.png',
  './icons/icon-72.png',
  './icons/icon-96.png',
  './icons/icon-144.png',
  './icons/icon-192.png',
  './icons/icon-384.png',
  './icons/icon-512.png',
  './icons/icon-maskable.png',
  './icons/apple-touch-76.png',
  './icons/apple-touch-120.png',
  './icons/apple-touch-152.png',
  './icons/apple-touch-167.png',
  './icons/apple-touch-180.png',
  './icons/splash-640x1136.png',
  './icons/splash-750x1334.png',
  './icons/splash-1125x2436.png',
  './icons/splash-1170x2532.png',
  './icons/splash-1284x2778.png',
  './icons/splash-1536x2048.png',
  './icons/splash-1668x2388.png',
  './icons/splash-2048x2732.png',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js'
];

/* Install: pre-cache everything */
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

/* Activate: remove stale caches */
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* Fetch: cache-first for same-origin; network-first for CDN */
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isCDN = url.origin !== self.location.origin;

  if (isCDN) {
    /* CDN: network-first, fall back to cache */
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    /* Same-origin: cache-first, fall back to network, then offline page */
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;
          return fetch(event.request)
            .then(res => {
              const clone = res.clone();
              caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
              return res;
            })
            .catch(() => caches.match('./index.html'));
        })
    );
  }
});