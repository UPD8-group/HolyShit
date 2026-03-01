// HolyShit.app — Service Worker
// Caches the app shell + toilet data for offline use.
// Version bump triggers a cache refresh on next load.

const CACHE_VERSION = 'hs-v1.1';
const SHELL_CACHE   = CACHE_VERSION + '-shell';
const DATA_CACHE    = CACHE_VERSION + '-data';

// App shell: everything needed to render without a network connection
const SHELL_ASSETS = [
    '/',
    '/index.html',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// ── Install: pre-cache the app shell ──
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then(cache => {
            console.log('[SW] Pre-caching app shell');
            return cache.addAll(SHELL_ASSETS);
        })
    );
    self.skipWaiting(); // Activate immediately
});

// ── Activate: delete old caches ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== SHELL_CACHE && key !== DATA_CACHE)
                    .map(key => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            )
        )
    );
    self.clients.claim(); // Take control of all pages immediately
});

// ── Fetch: stale-while-revalidate for data, cache-first for shell ──
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Never intercept Google Maps API calls — they need to be live
    if (url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com')    ||
        url.hostname.includes('maps.google.com')) {
        return;
    }

    // Toilet data: stale-while-revalidate
    // Serve cached version instantly, update in background
    if (url.pathname.includes('toilets-au.json') ||
        url.pathname.includes('holyshit_master')) {
        event.respondWith(
            caches.open(DATA_CACHE).then(async cache => {
                const cached = await cache.match(event.request);
                const fetchPromise = fetch(event.request).then(response => {
                    if (response.ok) cache.put(event.request, response.clone());
                    return response;
                }).catch(() => null);

                return cached || fetchPromise;
            })
        );
        return;
    }

    // App shell: cache-first
    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;
            return fetch(event.request).then(response => {
                // Cache successful GET responses for shell assets
                if (response.ok && event.request.method === 'GET') {
                    caches.open(SHELL_CACHE).then(cache => {
                        cache.put(event.request, response.clone());
                    });
                }
                return response;
            });
        })
    );
});
