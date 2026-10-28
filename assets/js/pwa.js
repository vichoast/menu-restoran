// Registra el service worker y maneja el botón "Instalar la app" del sitio público.
// El botón se muestra siempre (menos si ya está instalada). Si el navegador permite
// instalar directo, abre su ventana de instalación; si no, muestra los pasos.
if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(e => console.warn("SW", e)));
}

const yaInstalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const esAndroid = /android/i.test(navigator.userAgent);
let aviso = null;

const pasos = () => esIOS
  ? "En iPhone: abre esta página en Safari, toca Compartir (el cuadrado con flecha) y luego “Agregar a pantalla de inicio”."
  : esAndroid
    ? "En Android: abre el menú de Chrome (los tres puntos ⋮) y toca “Instalar app” o “Agregar a pantalla principal”."
    : "En el computador: haz clic en el ícono de instalar al final de la barra de direcciones, o en el menú ⋮ → “Instalar Restaurant San José”.";

function mostrar() {
  document.querySelectorAll(".instalar").forEach(c => c.classList.toggle("oculto", yaInstalada()));
}

addEventListener("beforeinstallprompt", e => { e.preventDefault(); aviso = e; mostrar(); });
addEventListener("appinstalled", () => { aviso = null; mostrar(); });

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-instalar]");
  if (!b) return;
  if (aviso) { aviso.prompt(); await aviso.userChoice.catch(() => {}); aviso = null; return; }
  const ayuda = b.closest(".instalar").querySelector(".instalar-ios");
  if (ayuda) { ayuda.textContent = pasos(); ayuda.classList.remove("oculto"); }
});

if (document.readyState !== "loading") mostrar(); else document.addEventListener("DOMContentLoaded", mostrar);
