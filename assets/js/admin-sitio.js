// Panel · pestañas nuevas de la página web: Textos, Fotos, Calendario de eventos y Solicitudes.
// Va en un archivo aparte para no tocar el código del menú, pedidos y reparto.
import { getApps, getApp, initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, onValue, set, update, remove } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { getStorage, ref as sRef, uploadBytes, getDownloadURL, deleteObject } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
import { firebaseConfig } from "./firebase.js";
import { TEXTOS_BASE, esc, soloNumeros } from "./contenido.js";
import { listaFranjas, estadoFranja, estadoDia, celdasMes, clave, hoyClave, MESES, fechaBonita, FRANJAS_BASE } from "./calendario.js";

// Reutiliza la conexión que abrió el panel (mismo login)
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
let storage = null;
try { storage = getStorage(app); } catch (e) { console.warn("Storage no disponible", e); }

const $ = id => document.getElementById(id);
const I = d => '<svg class="i" viewBox="0 0 24 24" aria-hidden="true">' + d + "</svg>";
const IC = {
  arriba: I('<path d="M12 19V5M6 11l6-6 6 6"/>'),
  abajo: I('<path d="M12 5v14M6 13l6 6 6-6"/>'),
  cambiar: I('<path d="M4 4v6h6"/><path d="M20 20v-6h-6"/><path d="M20 10A8 8 0 0 0 6 6L4 10M4 14a8 8 0 0 0 14 4l2-4"/>'),
  basura: I('<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>'),
  subir: I('<path d="M12 16V4M6 10l6-6 6 6"/><path d="M4 20h16"/>'),
  check: I('<path d="M5 12l5 5L20 7"/>'),
  fono: I('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>'),
  wsp: '<svg class="i" viewBox="0 0 32 32" aria-hidden="true" style="fill:currentColor;stroke:none"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3zm0 23.7c-2 0-3.9-.5-5.6-1.5l-.4-.2-3.9 1 1-3.8-.3-.4A10.7 10.7 0 1 1 16 26.7zm5.9-8c-.3-.2-1.9-1-2.2-1-.3-.1-.5-.2-.7.2l-1 1.2c-.2.2-.4.2-.7.1a8.8 8.8 0 0 1-4.4-3.8c-.3-.6.3-.5.9-1.7.1-.2 0-.4 0-.5l-1-2.4c-.3-.6-.5-.5-.7-.5h-.6c-.2 0-.5.1-.8.4-.3.3-1 1-1 2.5s1.1 2.9 1.2 3.1c.2.2 2.1 3.3 5.2 4.6 1.9.8 2.7.9 3.6.7.6-.1 1.9-.8 2.1-1.5.3-.7.3-1.4.2-1.5 0-.2-.3-.3-.6-.4z"/></svg>'
};

// Mismo aviso verde que usa el panel
let avisoT;
function aviso(texto) {
  const t = $("toast");
  t.innerHTML = IC.check + "<span></span>";
  t.lastChild.textContent = texto;
  t.classList.add("show");
  clearTimeout(avisoT);
  avisoT = setTimeout(() => t.classList.remove("show"), 3500);
}
const fallo = (que, e) => { console.error(e); alert("No se pudo " + que + ".\n\nDetalle: " + (e && e.message ? e.message : e)); };

// ---------------- Navegación de las pestañas nuevas ----------------
// El panel original esconde sus 4 secciones al tocar cualquier botón nuevo;
// aquí solo mostramos/escondemos las 4 secciones nuevas.
const NUEVAS = ["tab-textos", "tab-fotos", "tab-eventos", "tab-solicitudes"];
document.querySelectorAll(".nav button").forEach(b => {
  b.addEventListener("click", () => NUEVAS.forEach(id => $(id).classList.toggle("hidden", id !== b.dataset.tab)));
});

let iniciado = false;
onAuthStateChanged(auth, user => {
  if (!user || iniciado) return;
  iniciado = true;
  iniciarTextos();
  iniciarFotos();
  iniciarEventos();
  iniciarSolicitudes();
});

// =================================================================
// TEXTOS
// =================================================================
const CAMPOS = [
  { titulo: "Portada" },
  { k: "heroTitulo", l: "Título grande", tipo: "linea" },
  { k: "heroFrase", l: "Frase bajo el título", tipo: "linea" },
  { titulo: "Quiénes somos" },
  { k: "nosotrosTitulo", l: "Título", tipo: "linea" },
  { k: "nosotros", l: "Texto", tipo: "area", ayuda: "Deja una línea en blanco para separar párrafos." },
  { k: "galeriaTitulo", l: "Título de la galería de fotos", tipo: "linea" },
  { titulo: "Eventos" },
  { k: "eventosTitulo", l: "Título", tipo: "linea" },
  { k: "eventosIntro", l: "Texto de presentación", tipo: "area" },
  { titulo: "Ubicación y contacto" },
  { k: "direccion", l: "Dirección", tipo: "linea", ayuda: "Con comuna, para que el mapa la encuentre. Ej: Av. San José 123, Puente Alto" },
  { k: "comoLlegar", l: "Cómo llegar (opcional)", tipo: "linea", ayuda: "Ej: a media cuadra del paradero, frente a la plaza." },
  { k: "telefono", l: "Teléfono fijo (opcional)", tipo: "linea", ayuda: "El WhatsApp y el horario se cambian en “Datos del local”." },
  { k: "correo", l: "Correo (opcional)", tipo: "linea" },
  { k: "instagram", l: "Instagram (opcional)", tipo: "linea", ayuda: "Solo el usuario, ej: @restaurantsanjose" },
  { k: "facebook", l: "Facebook (opcional)", tipo: "linea", ayuda: "El enlace de la página o el nombre de usuario." }
];

function iniciarTextos() {
  const cont = $("textos-campos");
  cont.innerHTML = CAMPOS.map(c => c.titulo
    ? `<h3 style="font-size:1.4rem;font-weight:800;margin:26px 0 12px;padding-top:18px;border-top:2px dashed var(--borde)">${esc(c.titulo)}</h3>`
    : `<div class="field"><label for="tx-${c.k}">${esc(c.l)}</label>${c.ayuda ? `<p class="help">${esc(c.ayuda)}</p>` : ""}
       ${c.tipo === "area" ? `<textarea id="tx-${c.k}" maxlength="1500"></textarea>` : `<input type="text" id="tx-${c.k}" maxlength="200">`}</div>`).join("");
  cont.firstElementChild.style.cssText += ";border-top:0;margin-top:0;padding-top:0";
  CAMPOS.filter(c => c.k).forEach(c => { $("tx-" + c.k).placeholder = TEXTOS_BASE[c.k] || ""; });

  onValue(ref(db, "sitio/textos"), s => {
    const v = s.val() || {};
    CAMPOS.filter(c => c.k).forEach(c => { const el = $("tx-" + c.k); if (document.activeElement !== el) el.value = v[c.k] || ""; });
  });

  $("btn-guardar-textos").onclick = () => {
    const datos = {};
    CAMPOS.filter(c => c.k).forEach(c => { const v = $("tx-" + c.k).value.trim(); if (v) datos[c.k] = v; });
    set(ref(db, "sitio/textos"), datos).then(() => aviso("¡Listo! Textos publicados.")).catch(e => fallo("guardar los textos", e));
  };
}

// =================================================================
// FOTOS
// =================================================================
const GRUPOS = [
  { id: "hero", t: "Foto de portada", ayuda: "Sale grande al lado del título. Si no hay, se muestra el menú del día. Se usa solo la primera.", max: 3 },
  { id: "galeria", t: "Galería", ayuda: "Comida, el comedor, la cocina, la fachada. Lo ideal: entre 5 y 12 fotos.", max: 30 },
  { id: "eventos", t: "Fotos de eventos", ayuda: "Salen en la página de Eventos. Matrimonios, bingos, el salón decorado.", max: 12 }
];
let fotos = {};

// Achica la foto a 1600 px como máximo y la convierte a WebP (o JPG si el navegador no puede)
async function comprimir(archivo) {
  let fuente;
  try { fuente = await createImageBitmap(archivo); }
  catch (e) {
    fuente = await new Promise((ok, mal) => {
      const img = new Image();
      img.onload = () => ok(img);
      img.onerror = () => mal(new Error("No se pudo leer la foto. Prueba con una foto JPG o PNG."));
      img.src = URL.createObjectURL(archivo);
    });
  }
  const MAX = 1600;
  const w0 = fuente.width, h0 = fuente.height;
  const k = Math.min(1, MAX / Math.max(w0, h0));
  const c = document.createElement("canvas");
  c.width = Math.round(w0 * k); c.height = Math.round(h0 * k);
  c.getContext("2d").drawImage(fuente, 0, 0, c.width, c.height);
  const aBlob = (tipo, q) => new Promise(ok => c.toBlob(ok, tipo, q));
  let blob = await aBlob("image/webp", 0.82);
  if (!blob || blob.type !== "image/webp") blob = await aBlob("image/jpeg", 0.85);
  return blob;
}

function avisoStorage(e) {
  const box = $("fotos-aviso");
  const sinPermiso = /unauthorized|permission|bucket|not-found|storage\/(unknown|retry-limit)|no-default-bucket/i.test(String(e && (e.code || e.message)));
  box.textContent = sinPermiso || !storage
    ? "Las fotos todavía no están activadas en Firebase. Hay que activar “Storage” en la consola de Firebase (ver instrucciones de instalación)."
    : "No se pudo subir la foto: " + (e && e.message ? e.message : e);
  box.classList.remove("hidden");
}

async function subirArchivo(archivo, grupo) {
  if (!storage) throw new Error("storage-no-disponible");
  const blob = await comprimir(archivo);
  const ext = blob.type === "image/webp" ? "webp" : "jpg";
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const ruta = "fotos/" + grupo + "/" + id + "." + ext;
  const r = sRef(storage, ruta);
  await uploadBytes(r, blob, { contentType: blob.type, cacheControl: "public,max-age=31536000" });
  const url = await getDownloadURL(r);
  return { id, ruta, url };
}

const deGrupo = g => Object.entries(fotos).map(([id, f]) => ({ id, ...f })).filter(f => f.seccion === g).sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));

function iniciarFotos() {
  const cont = $("fotos-grupos");
  cont.innerHTML = GRUPOS.map(g => `
    <div class="grupo-fotos" data-g="${g.id}">
      <h3>${esc(g.t)}</h3>
      <p class="help">${esc(g.ayuda)}</p>
      <div class="fotos-grid" id="fg-${g.id}"></div>
      <label class="btn btn-rojo subir">${IC.subir}<span>Subir fotos</span><input type="file" accept="image/*" multiple data-subir="${g.id}"></label>
      <p class="progreso" id="fp-${g.id}"></p>
    </div>`).join("");

  onValue(ref(db, "sitio/fotos"), s => { fotos = s.val() || {}; GRUPOS.forEach(g => pintarGrupo(g)); });

  cont.addEventListener("change", async e => {
    const inp = e.target;
    if (inp.dataset.subir) {
      const g = GRUPOS.find(x => x.id === inp.dataset.subir);
      const archivos = [...inp.files];
      inp.value = "";
      if (!archivos.length) return;
      const ya = deGrupo(g.id);
      if (ya.length + archivos.length > g.max) { alert("En “" + g.t + "” caben hasta " + g.max + " fotos. Quita alguna antes de subir más."); return; }
      $("fotos-aviso").classList.add("hidden");
      let orden = ya.length ? Math.max(...ya.map(f => f.orden ?? 0)) + 1 : 0;
      for (let i = 0; i < archivos.length; i++) {
        $("fp-" + g.id).textContent = "Subiendo foto " + (i + 1) + " de " + archivos.length + "…";
        try {
          const { id, ruta, url } = await subirArchivo(archivos[i], g.id);
          await set(ref(db, "sitio/fotos/" + id), { url, ruta, alt: "", seccion: g.id, orden: orden++, creado: Date.now() });
        } catch (err) { console.error(err); avisoStorage(err); break; }
      }
      $("fp-" + g.id).textContent = "";
      aviso("¡Listo! Fotos subidas.");
    }
    if (inp.dataset.reemplazar) {
      const id = inp.dataset.reemplazar, vieja = fotos[id];
      const archivo = inp.files[0];
      inp.value = "";
      if (!archivo || !vieja) return;
      const item = inp.closest(".foto-item");
      item.classList.add("subiendo");
      try {
        const nueva = await subirArchivo(archivo, vieja.seccion);
        await update(ref(db, "sitio/fotos/" + id), { url: nueva.url, ruta: nueva.ruta });
        if (vieja.ruta) deleteObject(sRef(storage, vieja.ruta)).catch(() => {});
        aviso("¡Listo! Foto reemplazada.");
      } catch (err) { avisoStorage(err); item.classList.remove("subiendo"); }
    }
  });

  cont.addEventListener("click", async e => {
    const b = e.target.closest("button[data-acc]");
    if (!b) return;
    const id = b.dataset.id, f = fotos[id];
    if (!f) return;
    if (b.dataset.acc === "quitar") {
      if (!confirm("¿Quitar esta foto de la página?")) return;
      try {
        await remove(ref(db, "sitio/fotos/" + id));
        if (f.ruta && storage) deleteObject(sRef(storage, f.ruta)).catch(() => {});
        aviso("Foto quitada.");
      } catch (err) { fallo("quitar la foto", err); }
    }
    if (b.dataset.acc === "subir" || b.dataset.acc === "bajar") {
      const lista = deGrupo(f.seccion);
      const i = lista.findIndex(x => x.id === id), j = b.dataset.acc === "subir" ? i - 1 : i + 1;
      if (j < 0 || j >= lista.length) return;
      [lista[i], lista[j]] = [lista[j], lista[i]];
      const cambios = {};
      lista.forEach((x, n) => { cambios[x.id + "/orden"] = n; });
      update(ref(db, "sitio/fotos"), cambios).catch(err => fallo("ordenar las fotos", err));
    }
  });

  // Descripción de la foto: se guarda al salir del recuadro
  cont.addEventListener("focusout", e => {
    const inp = e.target;
    if (!inp.dataset.alt || !fotos[inp.dataset.alt]) return;
    const v = inp.value.trim();
    if (v === (fotos[inp.dataset.alt].alt || "")) return;
    update(ref(db, "sitio/fotos/" + inp.dataset.alt), { alt: v }).then(() => aviso("Descripción guardada.")).catch(err => fallo("guardar la descripción", err));
  });
}

function pintarGrupo(g) {
  const cont = $("fg-" + g.id);
  const lista = deGrupo(g.id);
  if (!lista.length) { cont.innerHTML = '<p class="sin-fotos">Todavía no hay fotos aquí.</p>'; return; }
  cont.innerHTML = lista.map((f, i) => `
    <div class="foto-item">
      <img src="${esc(f.url)}" alt="" loading="lazy">
      <div class="cuerpo">
        <input type="text" maxlength="140" data-alt="${esc(f.id)}" value="${esc(f.alt || "")}" placeholder="¿Qué se ve? Ej: cazuela de vacuno" aria-label="Descripción de la foto">
        <div class="botones">
          <button type="button" class="btn btn-borde" data-acc="subir" data-id="${esc(f.id)}" ${i === 0 ? "disabled" : ""} aria-label="Mover antes">${IC.arriba}</button>
          <button type="button" class="btn btn-borde" data-acc="bajar" data-id="${esc(f.id)}" ${i === lista.length - 1 ? "disabled" : ""} aria-label="Mover después">${IC.abajo}</button>
          <label class="btn btn-borde subir" aria-label="Reemplazar foto" title="Reemplazar">${IC.cambiar}<input type="file" accept="image/*" data-reemplazar="${esc(f.id)}"></label>
          <button type="button" class="btn btn-peligro" data-acc="quitar" data-id="${esc(f.id)}" aria-label="Quitar foto">${IC.basura}</button>
        </div>
      </div>
    </div>`).join("");
}

// =================================================================
// CALENDARIO DE EVENTOS
// =================================================================
let disp = {}, notas = {}, franjasObj = null, franjas = listaFranjas(null);
let vista = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let diaSel = null;
const ESTADOS = [["libre", "Libre"], ["bloqueado", "Bloqueado"], ["reservado", "Reservado"]];

function iniciarEventos() {
  onValue(ref(db, "eventos/disponibilidad"), s => { disp = s.val() || {}; pintarCal(); pintarEditorDia(); pintarProximos(); });
  onValue(ref(db, "eventos/notas"), s => { notas = s.val() || {}; pintarCal(); pintarEditorDia(true); pintarProximos(); });
  onValue(ref(db, "eventos/franjas"), s => { franjasObj = s.val(); franjas = listaFranjas(franjasObj); pintarCal(); pintarEditorDia(); pintarProximos(); pintarFranjasEdit(); });

  $("acal-ant").onclick = () => { vista = new Date(vista.getFullYear(), vista.getMonth() - 1, 1); pintarCal(); };
  $("acal-sig").onclick = () => { vista = new Date(vista.getFullYear(), vista.getMonth() + 1, 1); pintarCal(); };
  $("acal-dias").addEventListener("click", e => {
    const b = e.target.closest(".cal-dia");
    if (!b) return;
    diaSel = b.dataset.fecha;
    pintarCal(); pintarEditorDia(true);
    if (innerWidth < 1000) $("dia-editor").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("dia-editor").addEventListener("click", e => {
    const b = e.target.closest("button[data-e]");
    if (!b || !diaSel) return;
    const lista = b.dataset.f === "*" ? franjas.map(f => f.id) : [b.dataset.f];
    const cambios = {};
    lista.forEach(id => { cambios[id] = b.dataset.e === "libre" ? null : b.dataset.e; });
    update(ref(db, "eventos/disponibilidad/" + diaSel), cambios).catch(err => fallo("guardar el día", err));
  });
  $("dia-editor").addEventListener("focusout", e => {
    if (e.target.id !== "nota-dia" || !diaSel) return;
    const v = e.target.value.trim();
    if (v === ((notas[diaSel] || {}).texto || "")) return;
    set(ref(db, "eventos/notas/" + diaSel), v ? { texto: v } : null).then(() => aviso("Nota guardada.")).catch(err => fallo("guardar la nota", err));
  });
  $("proximos").addEventListener("click", e => {
    const li = e.target.closest("li[data-fecha]");
    if (!li) return;
    diaSel = li.dataset.fecha;
    const d = new Date(diaSel + "T12:00");
    vista = new Date(d.getFullYear(), d.getMonth(), 1);
    pintarCal(); pintarEditorDia(true);
    $("dia-editor").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("btn-franja-agregar").onclick = () => { $("franjas-edit").appendChild(filaFranja("", "", "")); $("franjas-edit").lastChild.querySelector("input").focus(); };
  $("btn-franjas-guardar").onclick = guardarFranjas;
}

function pintarCal() {
  const a = vista.getFullYear(), m = vista.getMonth();
  $("acal-mes").textContent = MESES[m] + " " + a;
  const hk = hoyClave();
  $("acal-dias").innerHTML = celdasMes(a, m).map(d => {
    if (!d) return '<span class="cal-vacio"></span>';
    const k = clave(d);
    const e = estadoDia(disp, k, franjas);
    const todoRes = e === "ocupado" && franjas.every(f => estadoFranja(disp, k, f.id) === "reservado");
    const cls = ["cal-dia", e !== "libre" ? e : "", todoRes ? "reservado-total" : "", k < hk ? "pasado" : "", k === hk ? "hoy" : "", notas[k] ? "con-nota" : ""].join(" ");
    return `<button type="button" class="${cls}" data-fecha="${k}" aria-pressed="${k === diaSel}" aria-label="${esc(fechaBonita(k))}">${d.getDate()}</button>`;
  }).join("");
}

function pintarEditorDia(conNota) {
  const box = $("dia-editor");
  if (!diaSel) return;
  const notaActual = (notas[diaSel] || {}).texto || "";
  const notaEl = $("nota-dia");
  const escribiendo = notaEl && document.activeElement === notaEl;
  const valorNota = escribiendo ? notaEl.value : notaActual;
  box.innerHTML = `<h3>${esc(fechaBonita(diaSel))}</h3>
    <p class="lbl" style="font-size:.95rem;margin-bottom:6px">Todo el día</p>
    <div class="todo-dia">${ESTADOS.map(([e, l]) => `<button type="button" class="btn btn-borde" data-f="*" data-e="${e}">${l}</button>`).join("")}</div>
    ${franjas.map(f => {
      const est = estadoFranja(disp, diaSel, f.id);
      return `<div class="franja-fila"><p class="nom">${esc(f.nombre)} ${f.detalle ? "<small>· " + esc(f.detalle) + "</small>" : ""}</p>
        <div class="segmento">${ESTADOS.map(([e, l]) => `<button type="button" data-f="${esc(f.id)}" data-e="${e}" aria-pressed="${est === e}">${l}</button>`).join("")}</div></div>`;
    }).join("")}
    <div class="field" style="margin:16px 0 0"><label for="nota-dia">Nota privada del día</label>
      <p class="help">Solo la ve el panel. Ej: “Matrimonio de Carolina, 90 personas, abonó”.</p>
      <textarea id="nota-dia" maxlength="500" style="min-height:96px"></textarea></div>`;
  $("nota-dia").value = valorNota;
  if (escribiendo) { $("nota-dia").focus(); }
}

function pintarProximos() {
  const hk = hoyClave();
  const fechas = [...new Set([...Object.keys(disp), ...Object.keys(notas)])].filter(k => k >= hk).sort().slice(0, 12);
  $("proximos").innerHTML = fechas.length ? fechas.map(k => {
    const ocup = franjas.filter(f => estadoFranja(disp, k, f.id) !== "libre").map(f => f.nombre + ": " + estadoFranja(disp, k, f.id));
    const n = (notas[k] || {}).texto;
    return `<li data-fecha="${k}"><b>${esc(fechaBonita(k))}</b><span>${esc(ocup.join(" · ") || "Libre")}${n ? " · " + esc(n) : ""}</span></li>`;
  }).join("") : '<li style="cursor:default"><span>No hay días ocupados por delante.</span></li>';
}

function filaFranja(id, nombre, detalle) {
  const fila = document.createElement("div");
  fila.className = "fila";
  fila.dataset.id = id;
  fila.innerHTML = '<input type="text" class="nom" maxlength="30" placeholder="Ej: Noche" aria-label="Nombre del horario">' +
    '<input type="text" class="det" maxlength="60" placeholder="Detalle (opcional)" aria-label="Detalle del horario">' +
    '<button type="button" class="btn btn-peligro btn-quitar" aria-label="Quitar este horario">' + IC.basura + "</button>";
  fila.querySelector(".nom").value = nombre;
  fila.querySelector(".det").value = detalle;
  fila.querySelector(".btn-quitar").onclick = () => fila.remove();
  return fila;
}

function pintarFranjasEdit() {
  const cont = $("franjas-edit");
  if (cont.contains(document.activeElement)) return;
  cont.innerHTML = "";
  franjas.forEach(f => cont.appendChild(filaFranja(f.id, f.nombre, f.detalle || "")));
}

function guardarFranjas() {
  const filas = [...document.querySelectorAll("#franjas-edit .fila")];
  const datos = {};
  const usados = new Set();
  filas.forEach((f, i) => {
    const nombre = f.querySelector(".nom").value.trim();
    if (!nombre) return;
    let id = f.dataset.id || nombre.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "horario";
    while (usados.has(id)) id += "-2";
    usados.add(id);
    datos[id] = { nombre, detalle: f.querySelector(".det").value.trim(), orden: i + 1 };
  });
  if (!Object.keys(datos).length) { alert("Tiene que quedar al menos un horario."); return; }
  set(ref(db, "eventos/franjas"), datos).then(() => aviso("¡Listo! Horarios guardados.")).catch(e => fallo("guardar los horarios", e));
}

// =================================================================
// SOLICITUDES DE EVENTOS
// =================================================================
let solicitudes = {}, filtro = "nueva";
const NOMBRE_ESTADO = { nueva: "Nueva", contactada: "En conversación", confirmada: "Confirmada", descartada: "Descartada" };

function iniciarSolicitudes() {
  onValue(ref(db, "eventos/solicitudes"), s => { solicitudes = s.val() || {}; pintarSolicitudes(); });
  $("sol-filtros").addEventListener("click", e => {
    const b = e.target.closest("button[data-f]");
    if (!b) return;
    filtro = b.dataset.f;
    document.querySelectorAll("#sol-filtros button").forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    pintarSolicitudes();
  });
  $("sol-lista").addEventListener("click", e => {
    const b = e.target.closest("button[data-acc]");
    if (!b) return;
    const id = b.dataset.id, s = solicitudes[id];
    if (!s) return;
    const acc = b.dataset.acc;
    if (acc === "borrar") {
      if (!confirm("¿Borrar para siempre la solicitud de " + (s.nombre || "esta persona") + "? Úsalo solo para mensajes basura.")) return;
      remove(ref(db, "eventos/solicitudes/" + id)).then(() => aviso("Solicitud borrada.")).catch(err => fallo("borrar", err));
      return;
    }
    update(ref(db, "eventos/solicitudes/" + id), { estado: acc, actualizado: Date.now() })
      .then(() => {
        aviso("Marcada como: " + NOMBRE_ESTADO[acc].toLowerCase() + ".");
        if (acc === "confirmada" && s.fecha) {
          const cuales = s.franja && s.franja !== "conversar" && franjas.some(f => f.id === s.franja) ? [s.franja] : franjas.map(f => f.id);
          const nombres = franjas.filter(f => cuales.includes(f.id)).map(f => f.nombre.toLowerCase()).join(" y ");
          if (confirm("¿Marcar el " + fechaBonita(s.fecha).toLowerCase() + " (" + nombres + ") como reservado en el calendario?")) {
            const cambios = {};
            cuales.forEach(c => { cambios[c] = "reservado"; });
            update(ref(db, "eventos/disponibilidad/" + s.fecha), cambios)
              .then(() => {
                const n = (notas[s.fecha] || {}).texto;
                const linea = (s.tipo || "Evento") + " de " + (s.nombre || "") + (s.invitados ? ", " + s.invitados + " personas" : "");
                if (!n || !n.includes(linea)) set(ref(db, "eventos/notas/" + s.fecha), { texto: n ? n + "\n" + linea : linea });
                aviso("Día reservado en el calendario.");
              }).catch(err => fallo("reservar el día", err));
          }
        }
      }).catch(err => fallo("cambiar el estado", err));
  });
}

const haceCuanto = t => {
  if (!t) return "";
  const min = Math.round((Date.now() - t) / 60000);
  if (min < 1) return "recién";
  if (min < 60) return "hace " + min + " min";
  const h = Math.round(min / 60);
  if (h < 24) return "hace " + h + (h === 1 ? " hora" : " horas");
  return new Date(t).toLocaleDateString("es-CL", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
};

function pintarSolicitudes() {
  const todas = Object.entries(solicitudes).map(([id, s]) => ({ id, ...s })).sort((a, b) => (b.creado || 0) - (a.creado || 0));
  const nuevas = todas.filter(s => (s.estado || "nueva") === "nueva").length;
  $("sol-cuenta").textContent = nuevas ? nuevas : "";
  const lista = filtro === "todas" ? todas : todas.filter(s => (s.estado || "nueva") === filtro);
  const cont = $("sol-lista");
  if (!lista.length) {
    cont.innerHTML = '<div class="vacio"><b>' + (filtro === "nueva" ? "No hay solicitudes nuevas" : "No hay solicitudes aquí") + "</b>Cuando alguien consulte desde la página, aparecerá aquí sola.</div>";
    return;
  }
  cont.innerHTML = lista.map(s => {
    const est = s.estado || "nueva";
    const num = soloNumeros(s.telefono);
    const wsp = num.length >= 8 ? (num.length === 9 && num[0] === "9" ? "56" + num : num) : "";
    const saludo = "Hola " + (s.nombre || "").split(" ")[0] + ", te escribimos de Restaurant San José por tu consulta para " + (s.tipo || "tu evento").toLowerCase() + (s.fecha ? " el " + fechaBonita(s.fecha).toLowerCase() : "") + ".";
    const botones = {
      nueva: [["contactada", "Ya la contacté", "btn-carbon"], ["descartada", "Descartar", "btn-borde"]],
      contactada: [["confirmada", "Confirmar evento", "btn-verde"], ["descartada", "Descartar", "btn-borde"]],
      confirmada: [["contactada", "Volver a conversación", "btn-borde"], ["descartada", "Se cayó", "btn-peligro"]],
      descartada: [["nueva", "Recuperar", "btn-recuperar"], ["borrar", "Borrar", "btn-peligro"]]
    }[est] || [];
    return `<article class="sol ${esc(est)}">
      <div class="cab">
        <div><div class="quien">${esc(s.nombre || "Sin nombre")}</div><span class="tipo">${esc(s.tipo || "Evento")}</span></div>
        <span class="est ${esc(est)}">${esc(NOMBRE_ESTADO[est] || est)}</span>
      </div>
      <ul class="datos-sol">
        <li><b>Fecha:</b> ${s.fecha ? esc(fechaBonita(s.fecha)) : "Sin fecha todavía"}</li>
        <li><b>Horario:</b> ${esc(s.franjaNombre || "Lo conversamos")}</li>
        ${s.invitados ? `<li><b>Invitados:</b> ${esc(s.invitados)}</li>` : ""}
        <li><b>Teléfono:</b> ${esc(s.telefono || "")}</li>
        ${s.correo ? `<li><b>Correo:</b> <a href="mailto:${esc(s.correo)}">${esc(s.correo)}</a></li>` : ""}
      </ul>
      ${s.mensaje ? `<div class="msg">${esc(s.mensaje)}</div>` : ""}
      <div class="contacto">
        ${wsp ? `<a class="btn btn-verde" target="_blank" rel="noopener" href="https://wa.me/${wsp}?text=${encodeURIComponent(saludo)}">${IC.wsp}WhatsApp</a>` : ""}
        ${num ? `<a class="btn btn-borde" href="tel:${esc((s.telefono || "").replace(/[^\d+]/g, ""))}">${IC.fono}Llamar</a>` : ""}
      </div>
      <div class="acciones-sol">${botones.map(([a, l, c]) => `<button type="button" class="btn ${c}" data-acc="${a}" data-id="${esc(s.id)}">${l}</button>`).join("")}</div>
      <p class="cuando">Llegó ${esc(haceCuanto(s.creado))}</p>
    </article>`;
  }).join("");
}
