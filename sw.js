/**
 * sw.js - Service Worker para KeepAPP
 */

const CACHE_NAME = 'keepapp-v1';

// Todos los recursos locales con sus rutas exactas en la estructura
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './keepApp_logo.png',
  './css/styles.css',
  './js/app.js',
  './js/bbm.js',
  './js/benkyou.js',
  './js/dox.js',
  './js/geld.js',
  './js/goals.js',
  './js/tareas.js',
  'https://cdn.tailwindcss.com'
];

// Instalación: Guardar archivos en caché
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: Limpieza de cachés viejas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepción de peticiones de red
self.addEventListener('fetch', (e) => {
  // Ignorar peticiones externas de Apps Script o Google Drive para no guardar respuestas dinámicas
  if (e.request.url.includes('script.google.com') || e.request.url.includes('googleusercontent.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
