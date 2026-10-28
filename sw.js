
const VERSION = 'keepapp-v4';

const LOCAL = [
  './', './index.html', './manifest.json',
  './keepApp_logo.png', './keepApp_logo_k.png', './keepApp_icon-192.png', './keepApp_icon-512.png', './keepApp_icon-maskable-512.png',
  './css/styles.css',
  './js/auth.js', './js/app.js', './js/diario.js',
  './js/benkyou.js', './js/bbm.js', './js/kato.js', './js/goals.js', './js/tareas.js', './js/geld.js',
  './js/bucher.js', './js/kinos.js', './js/supertags.js', './js/agenda.js', './js/links.js', './js/dox.js', './js/medicinas.js'
];

const CDN = [
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.4.1/papaparse.min.js'
];

const HOSTS_CDN = ['cdn.tailwindcss.com', 'cdnjs.cloudflare.com'];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Uno por uno: si un archivo falta (404) no se cae toda la instalación
    await Promise.all([
      ...LOCAL.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => console.warn('[SW] No se pudo guardar', u))),
      ...CDN.map(u => fetch(u, { mode: 'no-cors' }).then(r => cache.put(u, r)).catch(() => console.warn('[SW] No se pudo guardar', u)))
    ]);
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const claves = await caches.keys();
    await Promise.all(claves.filter(k => k.startsWith('keepapp-') && k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function redPrimero(req) {
  return new Promise((resolve) => {
    let respondido = false;
    const responder = (r) => { if (!respondido) { respondido = true; resolve(r); } };

    // Si la red tarda más de 3 s y hay copia guardada, se usa la copia
    const reloj = setTimeout(async () => {
      const copia = await caches.match(req, { ignoreSearch: true });
      if (copia) responder(copia);
    }, 3000);

    fetch(req, { cache: 'no-cache' }).then((res) => {
      clearTimeout(reloj);
      if (res && res.ok) {
        const guardar = res.clone();
        caches.open(VERSION).then(c => c.put(req, guardar));
      }
      responder(res);
    }).catch(async () => {
      clearTimeout(reloj);
      const copia = await caches.match(req, { ignoreSearch: true });
      responder(copia || (req.mode === 'navigate' ? await caches.match('./index.html') : null) || Response.error());
    });
  });
}

async function cachePrimero(req) {
  const copia = await caches.match(req);
  if (copia) return copia;
  const res = await fetch(req);
  if (res && (res.ok || res.type === 'opaque')) {
    const guardar = res.clone();
    caches.open(VERSION).then(c => c.put(req, guardar));
  }
  return res;
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    e.respondWith(redPrimero(req));
  } else if (HOSTS_CDN.includes(url.hostname)) {
    e.respondWith(cachePrimero(req));
  }
  // Todo lo demás (Google, Apps Script, Drive...) pasa directo, sin intervenir
});
