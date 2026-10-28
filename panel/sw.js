// Service worker de la app SJ Panel
// 1) Permite instalar el panel como app y abrirlos sin internet (última versión guardada).
// 2) Muestra los avisos (notificaciones) de pedidos y solicitudes de eventos.
const VERSION = "sj-panel-v1";
const BASICOS = ["./", "index.html", "manifest.webmanifest",
  "assets/css/tokens.css", "assets/css/calendario.css", "assets/css/admin-sitio.css",
  "assets/js/firebase.js", "assets/js/contenido.js", "assets/js/calendario.js", "assets/js/admin-sitio.js", "assets/js/avisos.js",
  "assets/img/panel-192.png", "assets/img/insignia-96.png"];

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
    }).catch(() => caches.match(req, { ignoreSearch: req.mode === "navigate" }).then(r => r || caches.match("./")))
  );
});

// ----- Avisos -----
// "panel" o "panel#solicitudes" → la portada de esta app (con la sección si viene)
const aLink = l => { l = l || "panel"; const h = l.includes("#") ? l.slice(l.indexOf("#")) : ""; return "./" + h; };
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
    data: { link: aLink(d.link) }
  };
  e.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener("notificationclick", e => {
  e.notification.close();
  const destino = new URL(e.notification.data && e.notification.data.link || "./", self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(ws => {
    const abierta = ws.find(w => w.url.split("#")[0].split("?")[0] === destino.split("#")[0].split("?")[0]);
    if (abierta) { abierta.focus(); if (destino.includes("#")) abierta.navigate(destino).catch(() => {}); return; }
    return self.clients.openWindow(destino);
  }));
});
