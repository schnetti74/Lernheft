/* Lernheft: App-Hülle offline verfügbar machen. Online-Abgleich (Firebase) wird nie zwischengespeichert. */
const CACHE = 'lernheft-shell-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './favicon-32.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  const fonts = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (!sameOrigin && !fonts) return; // Firebase & Co. gehen direkt ins Netz

  if (req.mode === 'navigate') {
    // Seite: erst Netz (damit Updates ankommen), sonst gespeicherte Version
    e.respondWith(fetch(req).then(function (res) {
      const copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put('./index.html', copy); });
      return res;
    }).catch(function () {
      return caches.match('./index.html').then(function (m) { return m || caches.match('./'); });
    }));
    return;
  }
  // Rest: gespeichert, sonst Netz (und merken)
  e.respondWith(caches.match(req).then(function (hit) {
    if (hit) return hit;
    return fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
      return res;
    });
  }));
});
