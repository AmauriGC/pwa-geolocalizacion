// sw.js - Service Worker con estrategia Cache First

const CACHE_STATIC_NAME = 'static-geo-v1';
const STATIC_FILES = [
  './',
  './index.html',
  './styles.css',
  './geo-helper.js', // Módulo de geolocalización: también debe funcionar sin red
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// INSTALL: precachea el App Shell.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_STATIC_NAME)
      .then((cache) => cache.addAll(STATIC_FILES))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: borra cachés de versiones anteriores y toma el control.
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((nombres) => Promise.all(
        nombres
          .filter((nombre) => nombre !== CACHE_STATIC_NAME)
          .map((nombre) => caches.delete(nombre))
      ))
      .then(() => self.clients.claim())
  );
});

// FETCH: Cache First. Si está en caché se sirve de ahí; si no, va a la red.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request)
      .then((respuesta) => respuesta || fetch(event.request))
  );
});
