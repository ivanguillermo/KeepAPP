/**
 * sw.js - Service Worker para KeepAPP
 */

const CACHE_NAME = 'keepapp-v2';

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
  './js/bucher.js',
  './js/goals.js',
  './js/tareas.js',
  './js/bucher.js',
  './js/supertags.js',
  './js/kinos.js',
  './js/calendario.js',
  'https://cdn.tailwindcss.com'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

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

self.addEventListener('fetch', (e) => {
  if (e.request.url.includes('script.google.com') || e.request.url.includes('googleusercontent.com')) {
    return;
  }

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request);
    })
  );
});
