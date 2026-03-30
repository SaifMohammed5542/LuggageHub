// Service Worker for PWA — Partner App only
const CACHE_NAME = 'luggage-terminal-partner-v1';
const urlsToCache = [
  '/partner/applicationlication/dashboard',
  '/partner/applicationlication/scan',
  '/partner/applicationlication/history',
  '/partner/applicationlication/login',
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

// Fetch event — ONLY intercept partner app requests
// Everything else (OSM tiles, Nominatim, external APIs) passes through untouched
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Only handle same-origin requests that are partner app pages
  const isPartnerPage = url.origin === self.location.origin &&
    url.pathname.startsWith('/partner/');

  if (!isPartnerPage) {
    // Let the browser handle it normally — no SW interference
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});