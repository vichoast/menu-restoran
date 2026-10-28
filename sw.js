// Service worker de Restaurant San José
// Permite instalar el sitio como app y abrirlo sin internet (última versión guardada).
const VERSION = "sj-v2";
const BASICOS = ["./", "index.html", "carta.html", "eventos.html", "pedido.html", "404.html",
  "assets/css/tokens.css", "assets/css/sitio.css", "assets/css/pedido.css", "assets/css/calendario.css",
  "assets/js/firebase.js", "assets/js/contenido.js", "assets/js/calendario.js", "assets/js/eventos.js", "assets/js/pwa.js",
  "assets/img/logo.png", "assets/img/logo-white.png", "assets/img/app-192.png", "favicon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(BASICOS)).catch(() => {}).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

// Primero internet (siempre lo más nuevo); si no hay conexión, lo último guardado.
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Firebase, fuentes y WhatsApp van directo
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copia = res.clone(); caches.open(VERSION).then(c => c.put(req, copia)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then(r => r || caches.match("index.html")))
  );
});
