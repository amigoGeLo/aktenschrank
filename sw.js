// Service Worker: App-Hülle offline verfügbar machen. Dokumente liegen in IndexedDB, nicht hier.
const VERSION = 'v5';
const CACHE = 'aktenschrank-' + VERSION;
const SHELL = [
  './', 'index.html', 'manifest.webmanifest', 'privacy.html', 'impressum.html', 'css/app.css',
  'js/app.js', 'js/catalog.js', 'js/classify.js', 'js/core.js', 'js/export.js', 'js/extract.js', 'js/flows.js', 'js/glossary.js',
  'js/guide.js', 'js/i18n.js', 'js/install-gate.js', 'js/lock.js', 'js/icons.js', 'js/screens.js', 'js/settings.js', 'js/store.js', 'js/translate.js', 'js/ui.js', 'js/util.js',
  'data/cats.js', 'data/types-1.js', 'data/types-2.js', 'data/types-3.js', 'data/types-4.js', 'data/types-5.js', 'data/types-6.js',
  'vendor/jszip.min.js', 'vendor/pdf-lib.min.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('aktenschrank-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.hostname === 'api.anthropic.com') return;           // nie cachen
  const sameOrigin = url.origin === location.origin;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: sameOrigin });
    // Same-Origin: erst Netz im Hintergrund aktualisieren (stale-while-revalidate); Fremd (OCR-Modul): Cache zuerst.
    const net = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }).catch(() => null);
    if (hit) { if (sameOrigin) e.waitUntil(net); return hit; }
    const r = await net;
    if (r) return r;
    if (req.mode === 'navigate') return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
    return Response.error();
  })());
});
