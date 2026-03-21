/* HolyShit.app — Service Worker v2
   Strategy:
   - App shell (HTML, CSS, JS, fonts) → Cache First
   - State JSON data files            → Network First (data changes)
   - Google Maps tiles/API            → Network only (can't cache cross-origin)
*/

const CACHE_NAME    = 'holyshit-v2';
const DATA_CACHE    = 'holyshit-data-v2';

// Files that make up the app shell
const SHELL_ASSETS = [
    '/',
    '/app.html',
    '/index.html',
    '/manifest.json',
    '/favicon.png',
    '/favicon-32.png',
    '/favicon-48.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

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
                    .filter(k => k !== CACHE_NAME && k !== DATA_CACHE)
                    .map(k => caches.delete(k))
            )
        ).then(() => self.clients.claim())
    );
});

/* ── FETCH: routing logic ── */
self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    // Skip non-GET and cross-origin (Google Maps, fonts, etc.)
    if (event.request.method !== 'GET') return;
    if (url.origin !== location.origin) return;

    const path = url.pathname;

    // State JSON files → Network First, fall back to cache
    if (path.match(/\/toilets-[a-z]+\.json$/)) {
        event.respondWith(networkFirst(event.request, DATA_CACHE));
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
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch(e) {
        // Offline and not cached — return a minimal offline page if needed
        return new Response('Offline — please reconnect.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
        });
    }
}

/* ── Network-first strategy ── */
async function networkFirst(request, cacheName) {
    try {
        const response = await fetch(request);
        if (response.ok) {
            const cache = await caches.open(cacheName);
            cache.put(request, response.clone());
        }
        return response;
    } catch(e) {
        const cached = await caches.match(request);
        if (cached) return cached;
        return new Response('[]', {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
