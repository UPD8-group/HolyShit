/* HolyShit.app — Service Worker v4
   Toilet data is now live from OpenStreetMap (Overpass API), so there are
   no bundled data files left to cache.

   Strategy:
   - App shell (HTML, icons, manifest)   → Cache First
   - Versioned CDN assets (MapLibre)     → Cache First (immutable URLs)
   - Overpass / tiles / routing          → Network only (handled in-app)
*/

const CACHE_NAME = 'holyshit-v4';
const VENDOR_CACHE = 'holyshit-vendor-v4';

// Files that make up the app shell
const SHELL_ASSETS = [
    '/',
    '/app.html',
    '/index.html',
    '/privacy.html',
    '/terms.html',
    '/manifest.json',
    '/favicon.png',
    '/favicon-32.png',
    '/favicon-48.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Cross-origin assets safe to cache forever — the URLs carry a version
const VENDOR_HOSTS = ['unpkg.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

/* ── INSTALL: cache the app shell ── */
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(SHELL_ASSETS))
            .then(() => self.skipWaiting())
            .catch(err => {
                // Don't fail install if some assets are missing — just skip them
                console.warn('[SW] Shell cache partial failure:', err);
                return self.skipWaiting();
            })
    );
});

/* ── ACTIVATE: clean old caches ── */
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(k => k !== CACHE_NAME && k !== VENDOR_CACHE)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

/* ── FETCH: routing logic ── */
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // Cross-origin: only the versioned vendor assets, everything else
    // (Overpass, map tiles, OSRM) goes straight to the network.
    if (url.origin !== location.origin) {
        if (VENDOR_HOSTS.includes(url.hostname)) {
            event.respondWith(cacheFirst(event.request, VENDOR_CACHE));
        }
        return;
    }

    // App shell → Cache First, fall back to network
    event.respondWith(cacheFirst(event.request, CACHE_NAME));
});

/* ── Cache-first strategy ── */
async function cacheFirst(request, cacheName) {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
        const response = await fetch(request);
        // Don't cache opaque or error responses — they poison the cache
        if (response.ok && response.type !== 'opaque') {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch (e) {
        // Offline and not cached
        return new Response('Offline — please reconnect.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}
