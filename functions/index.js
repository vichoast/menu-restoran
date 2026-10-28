// Avisos (notificaciones) para el panel de Restaurant San José.
// Se ejecuta en Firebase Cloud Functions (requiere plan Blaze; el uso de un restaurante queda dentro de la cuota gratis).
// No cambia nada de los pedidos: solo lee el pedido nuevo y manda un aviso a los celulares que activaron avisos.
const { onValueCreated } = require("firebase-functions/v2/database");
const { setGlobalOptions } = require("firebase-functions/v2");
const admin = require("firebase-admin");

admin.initializeApp();
setGlobalOptions({ region: "us-central1", maxInstances: 2 });
const INSTANCIA = "menurestaurant-235f7-default-rtdb";

const clp = n => "$" + String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const fechaBonita = k => {
  if (!k) return "";
  const [a, m, d] = k.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d, 12)).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Santiago" });
};

// Junta los celulares inscritos. "soloAdmins" = solo cuentas de la caja (no RRHH).
async function destinatarios(soloAdmins) {
  const db = admin.database();
  const [avisos, admins, rrhh] = await Promise.all(["avisos", "admins", "rrhh"].map(p => db.ref(p).get().then(s => s.val() || {})));
  const lista = [];
  for (const [uid, equipos] of Object.entries(avisos)) {
    const permitido = admins[uid] === true || (!soloAdmins && rrhh[uid] === true);
    if (!permitido) continue;
    for (const [id, e] of Object.entries(equipos || {})) if (e && e.token) lista.push({ uid, id, token: e.token });
  }
  return lista;
}

async function enviar(lista, datos) {
  if (!lista.length) return;
  const res = await admin.messaging().sendEachForMulticast({
    tokens: lista.map(x => x.token),
    data: datos,
    webpush: { headers: { Urgency: "high", TTL: "3600" } }
  });
  // Borra celulares que ya no reciben avisos (app desinstalada, permiso quitado)
  const borrar = {};
  res.responses.forEach((r, i) => {
    const c = r.error && r.error.code;
    if (c === "messaging/registration-token-not-registered" || c === "messaging/invalid-registration-token" || c === "messaging/invalid-argument") {
      borrar["avisos/" + lista[i].uid + "/" + lista[i].id] = null;
    }
  });
  if (Object.keys(borrar).length) await admin.database().ref().update(borrar);
}

exports.avisoPedidoNuevo = onValueCreated({ ref: "/pedidos/{pedidoId}", instance: INSTANCIA }, async event => {
  const p = event.data.val() || {};
  const n = Number(p.cantidad) || 1;
  const empresa = p.empresa || "Particular";
  const partes = [n + (n === 1 ? " almuerzo" : " almuerzos")];
  if (empresa !== "Particular") partes.push(empresa); else if (p.total) partes.push(clp(p.total));
  if (p.nota) partes.push("Ojo: " + String(p.nota).slice(0, 60));
  await enviar(await destinatarios(false), {
    titulo: "Nuevo pedido · " + String(p.cliente || "Sin nombre").slice(0, 40),
    cuerpo: partes.join(" · "),
    link: "panel",
    tag: "pedido-" + event.params.pedidoId
  });
});

exports.avisoSolicitudEvento = onValueCreated({ ref: "/eventos/solicitudes/{solicitudId}", instance: INSTANCIA }, async event => {
  const s = event.data.val() || {};
  const partes = [s.tipo || "Evento"];
  if (s.fecha) partes.push(fechaBonita(s.fecha));
  if (s.invitados) partes.push(s.invitados + " personas");
  await enviar(await destinatarios(true), {
    titulo: "Consulta de evento · " + String(s.nombre || "").slice(0, 40),
    cuerpo: partes.join(" · "),
    link: "panel#solicitudes",
    tag: "evento-" + event.params.solicitudId
  });
});

// ---------------------------------------------------------------------------
// Revisión de pedidos: recalcula el total con el menú real del momento y marca
// los pedidos que no calzan (total distinto, plato que no está en el menú,
// empresa desconocida). NO cambia ni borra el pedido: deja la revisión en
// /pedidosRevision/{id} y el panel muestra una etiqueta "Revisar".
// La misma lógica de precios que usa pedido.html.
// ---------------------------------------------------------------------------
const MARCA_AUT = "⭐ [SOLO AUTORIZADOS]";
const DIETA_OTRO = "Otro plato / Dieta médica";
const EMPRESAS_OK = ["Particular", "FoodPro", "Europer"];
const listaDe = v => Array.isArray(v) ? v.filter(Boolean).map(String)
  : (v && typeof v === "object" ? Object.keys(v).sort((a, b) => Number(a) - Number(b)).map(k => v[k]).filter(Boolean).map(String) : []);
const limpiar = s => String(s).replace(/\s*\(\$\d+[\d.]*\)/gi, "").trim();
const precioEn = s => { const m = String(s).match(/\(\$(\d+[\d.]*)\)/); return m ? parseInt(m[1].replace(/\./g, ""), 10) : null; };
const sinMarca = s => String(s).replace(/⭐\s*\[(SOLO AUTORIZADOS|ESPECIAL)\]\s*/i, "").trim();

function revisar(p, menu) {
  const motivos = [];
  const base = Number(menu && menu.precio) || 6500;
  const empresa = p.empresa || "Particular";
  if (!EMPRESAS_OK.includes(empresa)) motivos.push("Empresa desconocida: " + empresa);

  const lineas = String(p.detalle || "").split(" | ");
  const linea = lineas.find(l => l.toLowerCase().startsWith("plato principal:"));
  const elegido = linea ? linea.slice(linea.indexOf(":") + 1).trim() : "";
  const esAutorizado = /\[(SOLO AUTORIZADOS|ESPECIAL)\]/i.test(elegido);
  const nombre = sinMarca(elegido);

  // Candidatos: platos normales y, si es "solo autorizados", los especiales y la dieta
  const candidatos = esAutorizado
    ? [...listaDe(menu && menu.especiales).map(r => ({ nom: limpiar(r), precio: precioEn(r) })),
       { nom: DIETA_OTRO, precio: Number(menu && menu.precioOtroEspecial) > 0 ? Math.round(Number(menu.precioOtroEspecial)) : null }]
    : listaDe(menu && menu.principales).map(r => ({ nom: limpiar(r), precio: precioEn(r) }));
  const calce = candidatos.filter(c => c.nom && nombre.startsWith(c.nom)).sort((a, b) => b.nom.length - a.nom.length)[0];

  let unitario = base;
  if (!elegido) {
    if (listaDe(menu && menu.principales).length) motivos.push("Pedido sin plato principal");
  } else if (!calce) {
    motivos.push("El plato no está en el menú de hoy: " + nombre.slice(0, 60));
  } else {
    unitario = calce.precio || base;
  }
  if (esAutorizado && empresa !== "Europer") motivos.push("Plato “solo autorizados” pedido por " + empresa);

  const cantidad = Number(p.cantidad) || 1;
  const esperado = unitario * cantidad;
  const recibido = Number(p.total) || 0;
  if (recibido !== esperado) motivos.push("El total no calza: llegó " + clp(recibido) + ", debería ser " + clp(esperado));

  return { ok: motivos.length === 0, motivos, totalEsperado: esperado, totalRecibido: recibido, revisado: Date.now() };
}

exports.revisarPedidoNuevo = onValueCreated({ ref: "/pedidos/{pedidoId}", instance: INSTANCIA }, async event => {
  const p = event.data.val() || {};
  const menu = (await admin.database().ref("menu").get()).val() || {};
  const r = revisar(p, menu);
  await admin.database().ref("pedidosRevision/" + event.params.pedidoId).set(r);
  if (!r.ok) {
    await enviar(await destinatarios(true), {
      titulo: "Revisar pedido · " + String(p.cliente || "Sin nombre").slice(0, 40),
      cuerpo: r.motivos.join(" · ").slice(0, 180),
      link: "panel",
      tag: "revisar-" + event.params.pedidoId
    });
  }
});

exports._revisar = revisar; // para pruebas
