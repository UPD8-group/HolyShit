const CACHE_NAME = 'holyshit-v5'; // Bumped version to clear out the old UI
const ASSETS = [
  '/',
  '/index.html',
  '/toilets-au.json'
];

self.addEventListener('install', (e) => {
  self.skipWaiting(); // Force the new service worker to take over immediately
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  // Delete the old v4 cache so users instantly see your new Search Bar update
  e.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

self.addEventListener('fetch', (e) => {
  // NETWORK FIRST STRATEGY
  // 1. Try to get the freshest code from Netlify
  // 2. If the user is offline, fall back to the saved cache
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
