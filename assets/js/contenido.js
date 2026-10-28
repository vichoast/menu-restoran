// Textos editables, fotos y utilidades compartidas del sitio público.
// Si Firebase no responde o un texto está vacío, se usan los textos de respaldo.
import { db } from "./firebase.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

export const TEXTOS_BASE = {
  heroTitulo: "Sabor de casa, todos los días.",
  heroFrase: "Pasa, siéntate, que la olla ya está en el fuego.",
  nosotrosTitulo: "Comida de casa y un lugar para celebrar",
  nosotros: "Somos un restaurante familiar. Cada mañana cocinamos el menú del día como se hace en la casa: con tiempo, ingredientes de verdad y porciones generosas.\n\nNuestro salón también es centro de eventos. Aquí se han celebrado matrimonios, bingos, completadas y actividades de la comuna. Si tienes algo que celebrar, conversemos.",
  galeriaTitulo: "Así se vive San José",
  eventosTitulo: "Celebra con nosotros",
  eventosIntro: "Matrimonios, bingos, cumpleaños, completadas o la actividad de tu junta de vecinos. Revisa qué días tenemos libres y cuéntanos tu idea: te respondemos para conversar los detalles.",
  direccion: "",
  comoLlegar: "",
  telefono: "",
  correo: "",
  instagram: "",
  facebook: "",
  horarioBase: "Almuerzo de 14:30 a 16:30"
};

export const $ = id => document.getElementById(id);
export const clp = n => new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 }).format(n || 0);
export const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
export const fechaLarga = d => cap(new Date(d).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long" }));
export const esc = v => String(v ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const soloNumeros = v => String(v || "").replace(/\D/g, "");
// Número de WhatsApp en formato internacional chileno: si viene con 9 dígitos y parte con 9 (celular), se le agrega el 56
export const numeroWsp = v => { const n = soloNumeros(v); return n.length === 9 && n[0] === "9" ? "56" + n : n; };

// Íconos de línea (trazos tipo Lucide, 2px)
const P = d => '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + d + "</svg>";
export const ICONOS = {
  reloj: P('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
  pin: P('<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>'),
  fono: P('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  correo: P('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
  instagram: P('<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/>'),
  facebook: P('<path d="M15 3h-2.5A3.5 3.5 0 0 0 9 6.5V9H7v3.5h2V21h3.5v-8.5H15l.5-3.5h-3V7a1 1 0 0 1 1-1H15z"/>'),
  whatsapp: '<svg class="i" viewBox="0 0 32 32" aria-hidden="true" style="fill:currentColor;stroke:none"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.7c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 1.9.8 2.7.9 3.6.7.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.4.2-1.5 0-.2-.3-.3-.6-.4z"/></svg>',
  flechaIzq: P('<path d="M15 6l-6 6 6 6"/>'),
  flechaDer: P('<path d="M9 6l6 6-6 6"/>'),
  calendario: P('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  check: P('<path d="M5 12l5 5L20 7"/>')
};

// Escucha un nodo de Firebase. Si falla, avisa con null para usar los respaldos.
export function escuchar(ruta, cb) {
  try {
    onValue(ref(db, ruta), s => cb(s.val()), err => { console.warn("No se pudo leer " + ruta, err); cb(null); });
  } catch (e) { console.warn(e); cb(null); }
}

// Textos: mezcla los guardados con los de respaldo (un texto vacío usa el de respaldo).
export function conTextos(cb) {
  escuchar("sitio/textos", val => {
    const t = { ...TEXTOS_BASE };
    if (val && typeof val === "object") Object.keys(val).forEach(k => { if (String(val[k] ?? "").trim()) t[k] = val[k]; });
    cb(t);
  });
}

// Fotos de una sección ordenadas
export function fotosDe(todas, seccion) {
  return Object.entries(todas || {})
    .map(([id, f]) => ({ id, ...f }))
    .filter(f => f && f.url && f.seccion === seccion)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

export const enlaceWhatsApp = (numero, texto) =>
  "https://wa.me/" + numeroWsp(numero) + (texto ? "?text=" + encodeURIComponent(texto) : "");

export const enlaceInstagram = v => {
  const s = String(v || "").trim();
  if (!s) return "";
  return /^https?:\/\//.test(s) ? s : "https://instagram.com/" + s.replace(/^@/, "");
};
export const enlaceFacebook = v => {
  const s = String(v || "").trim();
  if (!s) return "";
  return /^https?:\/\//.test(s) ? s : "https://facebook.com/" + s.replace(/^@/, "");
};

// Rellena el pie de página (presente en todas las páginas públicas)
export function iniciarPie() {
  let textos = { ...TEXTOS_BASE }, info = {};
  const pintar = () => {
    const lista = $("pie-contacto");
    if (!lista) return;
    const filas = [];
    const dir = textos.direccion || info.direccion;
    if (dir) filas.push(`<li>${esc(dir)}</li>`);
    if (info.whatsapp) filas.push(`<li><a href="${enlaceWhatsApp(info.whatsapp)}" target="_blank" rel="noopener">WhatsApp +${esc(numeroWsp(info.whatsapp))}</a></li>`);
    if (textos.telefono) filas.push(`<li><a href="tel:${esc(textos.telefono.replace(/\s/g, ""))}">${esc(textos.telefono)}</a></li>`);
    if (textos.correo) filas.push(`<li><a href="mailto:${esc(textos.correo)}">${esc(textos.correo)}</a></li>`);
    lista.innerHTML = filas.join("") || "<li>Restaurant San José</li>";
    const redes = $("pie-redes");
    if (redes) {
      const ig = enlaceInstagram(textos.instagram), fb = enlaceFacebook(textos.facebook);
      redes.innerHTML = (ig ? `<a href="${esc(ig)}" target="_blank" rel="noopener" aria-label="Instagram">${ICONOS.instagram}</a>` : "") +
        (fb ? `<a href="${esc(fb)}" target="_blank" rel="noopener" aria-label="Facebook">${ICONOS.facebook}</a>` : "");
    }
    const anio = $("pie-anio");
    if (anio) anio.textContent = new Date().getFullYear();
  };
  conTextos(t => { textos = t; pintar(); });
  escuchar("menu/info", v => { info = v || {}; pintar(); });
  pintar();
}

let avisoT;
export function aviso(texto) {
  let el = $("aviso");
  if (!el) { el = document.createElement("div"); el.id = "aviso"; el.className = "aviso"; el.setAttribute("role", "status"); document.body.appendChild(el); }
  el.textContent = texto;
  el.classList.add("ver");
  clearTimeout(avisoT);
  avisoT = setTimeout(() => el.classList.remove("ver"), 3000);
}

// Visor de fotos a pantalla completa
export function abrirVisor(url, texto) {
  const v = document.createElement("div");
  v.className = "visor";
  v.setAttribute("role", "dialog");
  v.setAttribute("aria-modal", "true");
  v.innerHTML = '<button class="cerrar" type="button" aria-label="Cerrar">×</button><img alt=""><p></p>';
  v.querySelector("img").src = url;
  v.querySelector("img").alt = texto || "";
  v.querySelector("p").textContent = texto || "";
  const cerrar = () => { v.remove(); document.removeEventListener("keydown", tecla); };
  const tecla = e => { if (e.key === "Escape") cerrar(); };
  v.addEventListener("click", e => { if (e.target === v || e.target.classList.contains("cerrar")) cerrar(); });
  document.addEventListener("keydown", tecla);
  document.body.appendChild(v);
  v.querySelector(".cerrar").focus();
}

// Dibuja una galería en un contenedor; si no hay fotos, deja marcadores
export function pintarGaleria(cont, fotos, marcadores) {
  if (!cont) return;
  cont.innerHTML = "";
  if (!fotos.length) {
    (marcadores || []).forEach(t => {
      const f = document.createElement("figure");
      f.innerHTML = '<div class="foto-vacia"></div>';
      f.firstChild.textContent = t;
      cont.appendChild(f);
    });
    return;
  }
  fotos.forEach(foto => {
    const f = document.createElement("figure");
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-label", "Ver foto" + (foto.alt ? ": " + foto.alt : ""));
    const img = document.createElement("img");
    img.src = foto.url;
    img.alt = foto.alt || "";
    img.loading = "lazy";
    img.decoding = "async";
    b.appendChild(img);
    b.onclick = () => abrirVisor(foto.url, foto.alt);
    f.appendChild(b);
    cont.appendChild(f);
  });
}
