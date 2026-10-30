// Panel · "Este celular": instalar el panel como app y activar avisos de pedidos y eventos.
import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, get, set, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getMessaging, getToken, deleteToken, isSupported } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js";
import { firebaseConfig } from "./firebase.js";

// Clave pública de Web Push (Firebase › Configuración › Cloud Messaging). Es pública, no es secreta.
const VAPID = "BIcjkfkGV7Dy1LhQ_5qD7YoVgMYAGAuHB3w0CNccCd3huZSlcqfzDOjgvIXcbw-Fgu3bciU3ija26NDpN9w1AqY";

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const $ = id => document.getElementById(id);

const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const instalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const CLAVE_LOCAL = "sj-aviso-id";
const leerLocal = () => { try { return localStorage.getItem(CLAVE_LOCAL); } catch (e) { return null; } };
const guardarLocal = v => { try { v ? localStorage.setItem(CLAVE_LOCAL, v) : localStorage.removeItem(CLAVE_LOCAL); } catch (e) {} };

// Solo la app SJ Panel (que trae su propio manifest) maneja instalación y avisos.
// En el admin.html del sitio, este recuadro se esconde y se muestra el enlace a la app.
const esApp = !!document.querySelector('link[rel="manifest"]');
if (!esApp) $("este-cel").classList.add("hidden");

// ---------- Service worker ----------
let registro = null;
const listoSW = (esApp && "serviceWorker" in navigator)
  ? navigator.serviceWorker.register("sw.js").then(r => (registro = r, navigator.serviceWorker.ready)).catch(e => { console.warn("SW", e); return null; })
  : Promise.resolve(null);

// ---------- Instalar el panel ----------
let pedirInstalar = null;
addEventListener("beforeinstallprompt", e => { e.preventDefault(); pedirInstalar = e; pintar(); });
addEventListener("appinstalled", () => { pedirInstalar = null; pintar(); });

const pasosInstalar = () => esIOS
  ? "En iPhone: abre el panel en Safari, toca Compartir (el cuadrado con flecha) y luego “Agregar a pantalla de inicio”. Después ábrelo desde ese ícono."
  : /android/i.test(navigator.userAgent)
    ? "En Android: abre el menú de Chrome (los tres puntos ⋮) y toca “Instalar app” o “Agregar a pantalla principal”."
    : "En el computador: haz clic en el ícono de instalar al final de la barra de direcciones, o en el menú ⋮ → “Instalar San José · Panel”.";
async function instalar(ayudaId) {
  if (pedirInstalar) { pedirInstalar.prompt(); await pedirInstalar.userChoice.catch(() => {}); pedirInstalar = null; pintar(); return; }
  $(ayudaId).textContent = pasosInstalar();
  $(ayudaId).classList.remove("hidden");
}
$("btn-instalar-panel").onclick = () => instalar("avisos-ayuda");
$("btn-instalar-login").onclick = () => instalar("instalar-login-ayuda");
// En la pantalla de ingreso: mostrar el botón solo en la app SJ Panel y si aún no está instalada
if (esApp && !instalada()) $("btn-instalar-login").classList.remove("hidden");

// ---------- Avisos ----------
let usuario = null, rol = null, soportado = false;

async function estadoAvisos() {
  if (!soportado) return "no";
  if (Notification.permission === "denied") return "bloqueado";
  if (Notification.permission === "granted" && leerLocal()) return "activo";
  return "apagado";
}

async function pintar() {
  const caja = $("este-cel");
  if (!caja || !esApp) return;
  $("btn-instalar-panel").classList.toggle("hidden", instalada());
  const est = await estadoAvisos();
  const txt = $("avisos-estado"), btn = $("btn-avisos"), prueba = $("btn-avisos-probar");
  prueba.classList.toggle("hidden", est !== "activo");
  btn.classList.remove("hidden");
  if (!usuario || !rol) { txt.textContent = rol === false ? "Esta cuenta no puede recibir avisos." : "Cargando…"; btn.classList.add("hidden"); return; }
  if (est === "no") {
    txt.textContent = esIOS && !instalada()
      ? "Para recibir avisos en iPhone, primero instala el panel en la pantalla de inicio y ábrelo desde ese ícono."
      : "Este navegador no permite avisos. Prueba con Chrome.";
    btn.classList.add("hidden");
  } else if (est === "bloqueado") {
    txt.textContent = "Los avisos están bloqueados en este celular. Actívalos en los ajustes del navegador para este sitio.";
    btn.classList.add("hidden");
  } else if (est === "activo") {
    txt.textContent = rol === "admin" ? "Avisos activados: te avisamos cuando llegue un pedido o una consulta de evento." : "Avisos activados: te avisamos cuando llegue un pedido.";
    btn.textContent = "Apagar avisos";
    btn.className = "btn btn-borde";
  } else {
    txt.textContent = rol === "admin" ? "Activa los avisos para enterarte al tiro de pedidos y consultas de eventos." : "Activa los avisos para enterarte al tiro de cada pedido.";
    btn.textContent = "Activar avisos";
    btn.className = "btn btn-rojo";
  }
}

const idDe = token => { let h = 0; for (const c of token) h = (h * 31 + c.charCodeAt(0)) | 0; return "e" + (h >>> 0).toString(36) + token.length.toString(36); };
const equipo = () => {
  const ua = navigator.userAgent;
  const so = /android/i.test(ua) ? "Android" : esIOS ? "iPhone" : /windows/i.test(ua) ? "Windows" : /mac/i.test(ua) ? "Mac" : "Otro";
  const nav = /edg\//i.test(ua) ? "Edge" : /chrome|crios/i.test(ua) ? "Chrome" : /firefox|fxios/i.test(ua) ? "Firefox" : /safari/i.test(ua) ? "Safari" : "";
  return (so + " " + nav).trim() + (instalada() ? " (app)" : "");
};

$("btn-avisos").onclick = async () => {
  const btn = $("btn-avisos");
  btn.disabled = true;
  try {
    if ((await estadoAvisos()) === "activo") {
      const id = leerLocal();
      const messaging = getMessaging(app);
      await deleteToken(messaging).catch(() => {});
      if (id) await remove(ref(db, "avisos/" + usuario.uid + "/" + id));
      guardarLocal(null);
    } else {
      const permiso = await Notification.requestPermission();
      if (permiso !== "granted") { await pintar(); return; }
      const reg = await listoSW;
      if (!reg) throw new Error("No se pudo preparar la app en este navegador.");
      const token = await getToken(getMessaging(app), { vapidKey: VAPID, serviceWorkerRegistration: registro || reg });
      if (!token) throw new Error("Firebase no entregó el permiso de avisos.");
      const id = idDe(token);
      await set(ref(db, "avisos/" + usuario.uid + "/" + id), { token, creado: Date.now(), equipo: equipo() });
      guardarLocal(id);
      const r = await navigator.serviceWorker.ready;
      r.showNotification("Avisos activados", { body: "Así se verán los avisos de pedidos.", icon: "assets/img/panel-192.png", badge: "assets/img/insignia-96.png", tag: "sj-prueba" }).catch(() => {});
    }
  } catch (e) {
    console.error(e);
    alert("No se pudieron cambiar los avisos.\n\nDetalle: " + (e && e.message ? e.message : e));
  } finally {
    btn.disabled = false;
    pintar();
  }
};

$("btn-avisos-probar").onclick = async () => {
  const r = await navigator.serviceWorker.ready;
  r.showNotification("Nuevo pedido · Prueba", { body: "1 almuerzo · $6.000", icon: "assets/img/panel-192.png", badge: "assets/img/insignia-96.png", tag: "sj-prueba" }).catch(e => alert("No se pudo mostrar el aviso: " + e.message));
};

isSupported().catch(() => false).then(ok => { soportado = !!ok && "Notification" in window; pintar(); });

onAuthStateChanged(auth, async user => {
  usuario = user;
  rol = null;
  if (!user) { pintar(); return; }
  try {
    const a = await get(ref(db, "admins/" + user.uid));
    rol = a.val() === true ? "admin" : false; // los avisos son solo para la caja
  } catch (e) { rol = false; }
  pintar();
  // Si se abrió desde un aviso de evento, ir directo a Solicitudes
  if (location.hash === "#solicitudes") { const b = document.querySelector('[data-tab="tab-solicitudes"]'); if (b) b.click(); }
});
