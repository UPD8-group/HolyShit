const CACHE_VERSION = 'hs-v1.6';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE = `${CACHE_VERSION}-data`;

const SHELL_ASSETS = [
    '/',
    '/index.html',
    '/app.html',
    '/manifest.json',
    '/logo.png',
    '/favicon-16.png',
    '/favicon-32.png',
    '/favicon-48.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(SHELL_CACHE).then(cache => cache.addAll(SHELL_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== SHELL_CACHE && key !== DATA_CACHE)
                    .map(key => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET') return;

    if (
        url.hostname.includes('googleapis.com') ||
        url.hostname.includes('gstatic.com') ||
        url.hostname.includes('maps.google.com')
    ) {
        return;
    }

    if (url.pathname.includes('/toilets-au.json') || url.pathname.includes('holyshit_master')) {
        event.respondWith(
            caches.open(DATA_CACHE).then(async cache => {
                try {
                    const fresh = await fetch(event.request, { cache: 'no-store' });
                    if (fresh.ok) {
                        cache.put(event.request, fresh.clone());
                    }
                    return fresh;
                } catch (err) {
                    const cached = await cache.match(event.request);
                    if (cached) return cached;
                    throw err;
                }
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request).then(cached => {
            if (cached) return cached;

            return fetch(event.request).then(response => {
                if (response.ok) {
                    caches.open(SHELL_CACHE).then(cache => {
                        cache.put(event.request, response.clone());
                    });
                }
                return response;
            });
        })
    );
});
