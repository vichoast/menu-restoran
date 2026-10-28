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
    link: "admin.html",
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
    link: "admin.html#solicitudes",
    tag: "evento-" + event.params.solicitudId
  });
});
