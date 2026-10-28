// Página de Eventos: calendario de disponibilidad + formulario de consulta
import { db } from "./firebase.js";
import { ref, push } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { $, ICONOS, esc, conTextos, escuchar, fotosDe, iniciarPie, enlaceWhatsApp, abrirVisor, aviso, soloNumeros } from "./contenido.js";
import { listaFranjas, estadoFranja, estadoDia, celdasMes, clave, hoyClave, MESES, fechaBonita } from "./calendario.js";

iniciarPie();
$("cal-ant").innerHTML = ICONOS.flechaIzq;
$("cal-sig").innerHTML = ICONOS.flechaDer;

const MESES_ADELANTE = 18;
const hoy = new Date();
let vista = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
let disp = {}, franjas = listaFranjas(null), elegido = null, info = {};

// ---------- Textos y fotos ----------
conTextos(t => {
  $("t-eventosTitulo").textContent = t.eventosTitulo;
  $("t-eventosIntro").textContent = t.eventosIntro;
});
escuchar("menu/info", v => { info = v || {}; });
escuchar("sitio/fotos", v => {
  const fotos = fotosDe(v, "eventos").slice(0, 4);
  const cont = $("fotos-ev");
  cont.classList.toggle("oculto", !fotos.length);
  cont.innerHTML = "";
  fotos.forEach(f => {
    const fig = document.createElement("figure");
    fig.innerHTML = '<button type="button"><img loading="lazy" alt=""></button>';
    const img = fig.querySelector("img");
    img.src = f.url; img.alt = f.alt || "";
    fig.querySelector("button").setAttribute("aria-label", "Ver foto" + (f.alt ? ": " + f.alt : ""));
    fig.querySelector("button").onclick = () => abrirVisor(f.url, f.alt);
    cont.appendChild(fig);
  });
});

// ---------- Calendario ----------
function pintarCalendario() {
  const a = vista.getFullYear(), m = vista.getMonth();
  $("cal-mes").textContent = MESES[m] + " " + a;
  const minimo = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const maximo = new Date(hoy.getFullYear(), hoy.getMonth() + MESES_ADELANTE, 1);
  $("cal-ant").disabled = vista <= minimo;
  $("cal-sig").disabled = vista >= maximo;

  const hk = hoyClave();
  const cont = $("cal-dias");
  cont.innerHTML = "";
  celdasMes(a, m).forEach(d => {
    if (!d) { const v = document.createElement("span"); v.className = "cal-vacio"; cont.appendChild(v); return; }
    const k = clave(d);
    const b = document.createElement("button");
    b.type = "button";
    b.className = "cal-dia";
    b.textContent = d.getDate();
    b.dataset.fecha = k;
    if (k < hk) { b.classList.add("pasado"); b.disabled = true; b.setAttribute("aria-label", d.getDate() + ", día pasado"); }
    else {
      const e = estadoDia(disp, k, franjas);
      if (e !== "libre") b.classList.add(e);
      const txt = e === "libre" ? "libre" : e === "parcial" ? "libre una parte del día" : "ocupado";
      b.setAttribute("aria-label", fechaBonita(k) + ", " + txt);
      b.setAttribute("aria-pressed", String(k === elegido));
    }
    if (k === hk) b.classList.add("hoy");
    cont.appendChild(b);
  });
}

function pintarDetalle() {
  const box = $("cal-detalle");
  if (!elegido) { box.innerHTML = '<p style="color:var(--text-muted)">Elige un día en el calendario.</p>'; return; }
  const e = estadoDia(disp, elegido, franjas);
  const filas = franjas.map(f => {
    const est = estadoFranja(disp, elegido, f.id);
    const libre = est === "libre";
    return `<div class="franja-estado"><div><b>${esc(f.nombre)}</b>${f.detalle ? "<small>" + esc(f.detalle) + "</small>" : ""}</div>
      <span class="badge ${libre ? "badge--oliva" : "badge--crema"}">${libre ? "Libre" : "Ocupado"}</span></div>`;
  }).join("");
  box.innerHTML = `<h4>${esc(fechaBonita(elegido))}</h4>${filas}
    ${e === "ocupado"
      ? '<p style="margin-top:12px;color:var(--text-muted)">Ese día ya está tomado. Elige otra fecha o escríbenos igual: a veces se puede conversar.</p>'
      : '<button type="button" class="btn btn--primario btn--ancho" id="usar-dia" style="margin-top:14px">Consultar por este día</button>'}`;
  const btn = $("usar-dia");
  if (btn) btn.onclick = () => {
    $("f-fecha").value = elegido;
    revisarFecha();
    const libres = franjas.filter(f => estadoFranja(disp, elegido, f.id) === "libre");
    if (libres.length === 1) { const r = document.querySelector('input[name="franja"][value="' + libres[0].id + '"]'); if (r) r.checked = true; }
    $("consulta").scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => { const t = document.querySelector('input[name="tipo"]:checked') ? $("f-nombre") : document.querySelector('input[name="tipo"]'); t && t.focus({ preventScroll: true }); }, 450);
  };
}

$("cal-dias").addEventListener("click", e => {
  const b = e.target.closest(".cal-dia");
  if (!b || b.disabled) return;
  elegido = b.dataset.fecha;
  pintarCalendario();
  pintarDetalle();
});
$("cal-ant").onclick = () => { vista = new Date(vista.getFullYear(), vista.getMonth() - 1, 1); pintarCalendario(); };
$("cal-sig").onclick = () => { vista = new Date(vista.getFullYear(), vista.getMonth() + 1, 1); pintarCalendario(); };

function pintarFranjasForm() {
  const prev = (document.querySelector('input[name="franja"]:checked') || {}).value || "conversar";
  $("f-franjas").innerHTML = franjas.map(f =>
    `<label class="chip"><input type="radio" name="franja" value="${esc(f.id)}"><span>${esc(f.nombre)}</span></label>`).join("") +
    '<label class="chip"><input type="radio" name="franja" value="conversar"><span>Lo conversamos</span></label>';
  const r = document.querySelector('input[name="franja"][value="' + CSS.escape(prev) + '"]') || document.querySelector('input[name="franja"][value="conversar"]');
  r.checked = true;
}

escuchar("eventos/franjas", v => { franjas = listaFranjas(v); pintarFranjasForm(); pintarCalendario(); pintarDetalle(); revisarFecha(); });
escuchar("eventos/disponibilidad", v => { disp = v || {}; pintarCalendario(); pintarDetalle(); revisarFecha(); });
pintarFranjasForm();
pintarCalendario();

// ---------- Formulario ----------
$("f-fecha").min = hoyClave();
function revisarFecha() {
  const k = $("f-fecha").value;
  const nota = $("f-fecha-nota");
  nota.classList.remove("error");
  if (!k) { nota.textContent = "Si aún no la tienes, déjala en blanco."; return; }
  if (k < hoyClave()) { nota.textContent = "Esa fecha ya pasó."; nota.classList.add("error"); return; }
  const e = estadoDia(disp, k, franjas);
  nota.textContent = e === "libre" ? "Ese día está libre." : e === "parcial" ? "Ese día está libre solo una parte." : "Ese día está ocupado, pero puedes consultar igual.";
  if (e === "ocupado") nota.classList.add("error");
  document.querySelectorAll('input[name="franja"]').forEach(r => {
    if (r.value === "conversar") return;
    r.disabled = estadoFranja(disp, k, r.value) !== "libre";
    if (r.disabled && r.checked) document.querySelector('input[name="franja"][value="conversar"]').checked = true;
  });
}
$("f-fecha").addEventListener("change", revisarFecha);

const ULTIMA = "sj-ultima-consulta";
let enviando = false;

$("form-ev").addEventListener("submit", e => {
  e.preventDefault();
  if (enviando) return;
  const err = $("f-error");
  err.textContent = "";
  ["f-nombre", "f-telefono", "f-correo"].forEach(id => $(id).removeAttribute("aria-invalid"));

  if ($("f-web").value) return; // casilla trampa para robots
  const tipo = (document.querySelector('input[name="tipo"]:checked') || {}).value;
  const nombre = $("f-nombre").value.trim();
  const telefono = $("f-telefono").value.trim();
  const correo = $("f-correo").value.trim();
  const fecha = $("f-fecha").value;
  const franjaId = (document.querySelector('input[name="franja"]:checked') || {}).value || "conversar";
  const invitados = Math.max(0, Math.min(2000, parseInt($("f-invitados").value, 10) || 0));
  const mensaje = $("f-mensaje").value.trim();

  if (!tipo) { err.textContent = "Elige qué quieres celebrar."; document.querySelector('input[name="tipo"]').focus(); return; }
  if (!nombre) { err.textContent = "Escribe tu nombre."; $("f-nombre").setAttribute("aria-invalid", "true"); $("f-nombre").focus(); return; }
  if (soloNumeros(telefono).length < 8) { err.textContent = "Revisa tu WhatsApp o teléfono para poder contactarte."; $("f-telefono").setAttribute("aria-invalid", "true"); $("f-telefono").focus(); return; }
  if (correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) { err.textContent = "El correo parece mal escrito."; $("f-correo").setAttribute("aria-invalid", "true"); $("f-correo").focus(); return; }
  if (fecha && fecha < hoyClave()) { err.textContent = "La fecha ya pasó. Elige otra o déjala en blanco."; $("f-fecha").focus(); return; }

  try {
    const u = JSON.parse(localStorage.getItem(ULTIMA) || "null");
    if (u && Date.now() - u < 60000) { err.textContent = "Ya recibimos tu consulta hace un momento. Si quieres agregar algo, escríbenos por WhatsApp."; return; }
  } catch (x) {}

  const franja = franjas.find(f => f.id === franjaId);
  const solicitud = {
    tipo, nombre, telefono, correo, fecha, invitados, mensaje,
    franja: franjaId,
    franjaNombre: franja ? franja.nombre : "Lo conversamos",
    estado: "nueva",
    creado: Date.now()
  };

  enviando = true;
  $("f-enviar").disabled = true;
  $("f-enviar").textContent = "Enviando…";
  push(ref(db, "eventos/solicitudes"), solicitud)
    .then(() => {
      try { localStorage.setItem(ULTIMA, JSON.stringify(Date.now())); } catch (x) {}
      mostrarListo(solicitud);
    })
    .catch(x => {
      console.error(x);
      err.textContent = "No pudimos enviar tu consulta. Revisa tu conexión o escríbenos por WhatsApp.";
      enviando = false;
      $("f-enviar").disabled = false;
      $("f-enviar").textContent = "Enviar consulta";
    });
});

function mostrarListo(s) {
  const texto = "Hola, les acabo de enviar una consulta por la página para un evento (" + s.tipo + (s.fecha ? ", " + fechaBonita(s.fecha) : "") + "). Mi nombre es " + s.nombre + ".";
  $("form-caja").innerHTML = `<div class="listo">
      <span class="circulo">${ICONOS.check}</span>
      <h2>Recibimos tu consulta</h2>
      <p>Gracias, ${esc(s.nombre)}. Te vamos a escribir al <b>${esc(s.telefono)}</b> para conversar los detalles${s.fecha ? " del " + esc(fechaBonita(s.fecha).toLowerCase()) : ""}.</p>
      ${info.whatsapp ? `<a class="btn btn--borde btn--ancho" style="margin-top:20px" target="_blank" rel="noopener" href="${enlaceWhatsApp(info.whatsapp, texto)}">${ICONOS.whatsapp} Escribirnos por WhatsApp</a>` : ""}
    </div>`;
  $("consulta").scrollIntoView({ behavior: "smooth", block: "start" });
  aviso("Consulta enviada");
}
