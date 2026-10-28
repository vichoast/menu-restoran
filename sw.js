// Service worker de Restaurant San José
// 1) Permite instalar el sitio y el panel como app y abrirlos sin internet (última versión guardada).
// 2) Muestra los avisos (notificaciones) de pedidos y solicitudes de eventos.
const VERSION = "sj-v1";
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

// ----- Avisos -----
self.addEventListener("push", e => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (x) { m = { data: { titulo: "Restaurant San José", cuerpo: e.data && e.data.text() } }; }
  const d = m.data || {};
  const n = m.notification || {};
  const titulo = d.titulo || n.title || "Restaurant San José";
  const opciones = {
    body: d.cuerpo || n.body || "",
    icon: "assets/img/panel-192.png",
    badge: "assets/img/insignia-96.png",
    tag: d.tag || "sj",
    renotify: true,
    data: { link: (d.link || "panel").startsWith("panel") ? "https://vichoast.github.io/sj-panel/" + (d.link || "").replace(/^panel/, "") : d.link }
  };
  e.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const destino = new URL(e.notification.data && e.notification.data.link || "admin.html", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    const abierta = ws.find(w => w.url.split("#")[0].split("?")[0] === destino.split("#")[0].split("?")[0]);
    if (abierta) { abierta.focus(); if (destino.includes("#")) abierta.navigate(destino).catch(() => {}); return; }
    return self.clients.openWindow(destino);
  }));
});
