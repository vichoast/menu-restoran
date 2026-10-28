// Registra el service worker y maneja el botón "Instalar app" del sitio público.
if ("serviceWorker" in navigator) {
  addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(e => console.warn("SW", e)));
}

const yaInstalada = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const esIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
let aviso = null;

addEventListener("beforeinstallprompt", e => { e.preventDefault(); aviso = e; mostrar(); });
addEventListener("appinstalled", () => { aviso = null; document.querySelectorAll("[data-instalar]").forEach(b => b.closest(".instalar").classList.add("oculto")); });

function mostrar() {
  if (yaInstalada()) return;
  document.querySelectorAll("[data-instalar]").forEach(b => {
    const caja = b.closest(".instalar");
    if (aviso || esIOS) caja.classList.remove("oculto");
  });
}

document.addEventListener("click", async e => {
  const b = e.target.closest("[data-instalar]");
  if (!b) return;
  if (aviso) { aviso.prompt(); await aviso.userChoice.catch(() => {}); aviso = null; return; }
  const caja = b.closest(".instalar");
  const ayuda = caja.querySelector(".instalar-ios");
  if (ayuda) ayuda.classList.toggle("oculto");
});

if (document.readyState !== "loading") mostrar(); else document.addEventListener("DOMContentLoaded", mostrar);
