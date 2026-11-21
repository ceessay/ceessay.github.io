// Service worker : rend le site installable et consultable hors ligne.
// Réseau d'abord (le contenu reste toujours à jour), copie locale en secours.
var CACHE = 'mcisse-v1';
var ESSENTIEL = ['/', '/en/', '/main.js', '/favicon.svg', '/fonts/urbanist-latin.woff2',
  '/manifest.webmanifest', '/img/portrait-profil-600.webp', '/img/portrait-profil-900.webp'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ESSENTIEL); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (cles) {
      return Promise.all(cles.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () {
      return self.registration.navigationPreload ? self.registration.navigationPreload.enable() : null;
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith((async function () {
    try {
      var rep = (e.preloadResponse && await e.preloadResponse) || await fetch(req);
      if (rep && rep.ok && rep.type === 'basic') {
        var copie = rep.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copie); });
      }
      return rep;
    } catch (err) {
      var local = await caches.match(req, { ignoreSearch: req.mode === 'navigate' });
      if (local) return local;
      if (req.mode === 'navigate') return (await caches.match(new URL(req.url).pathname.indexOf('/en/') === 0 ? '/en/' : '/')) || Response.error();
      return Response.error();
    }
  })());
});
