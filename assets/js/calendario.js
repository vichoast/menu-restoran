// Utilidades del calendario de eventos (las usa el sitio y el panel)

// Horarios por defecto si el panel todavía no define otros
export const FRANJAS_BASE = {
  dia: { nombre: "Día", detalle: "Mañana y tarde", orden: 1 },
  noche: { nombre: "Noche", detalle: "Desde la tarde-noche", orden: 2 }
};

export const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];

const dos = n => String(n).padStart(2, "0");
// Fecha local → "AAAA-MM-DD" (sin pasar por UTC, para que no se corra un día)
export const clave = d => d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate());
export const desdeClave = k => { const [a, m, d] = k.split("-").map(Number); return new Date(a, m - 1, d); };
export const hoyClave = () => clave(new Date());

export function listaFranjas(obj) {
  const src = obj && typeof obj === "object" && Object.keys(obj).length ? obj : FRANJAS_BASE;
  return Object.entries(src)
    .filter(([, f]) => f && f.nombre)
    .map(([id, f]) => ({ id, ...f }))
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0));
}

// Estado de una franja en un día: 'libre' | 'bloqueado' | 'reservado'
export const estadoFranja = (disp, fecha, id) => (disp && disp[fecha] && disp[fecha][id]) || "libre";

// Estado del día: 'libre' | 'parcial' | 'ocupado'
export function estadoDia(disp, fecha, franjas) {
  if (!franjas.length) return "libre";
  const ocupadas = franjas.filter(f => estadoFranja(disp, fecha, f.id) !== "libre").length;
  if (!ocupadas) return "libre";
  return ocupadas === franjas.length ? "ocupado" : "parcial";
}

// Celdas de un mes empezando en lunes: null = hueco
export function celdasMes(anio, mes) {
  const primero = new Date(anio, mes, 1);
  const huecos = (primero.getDay() + 6) % 7;
  const total = new Date(anio, mes + 1, 0).getDate();
  const celdas = Array(huecos).fill(null);
  for (let d = 1; d <= total; d++) celdas.push(new Date(anio, mes, d));
  return celdas;
}

export const fechaBonita = k => {
  const s = desdeClave(k).toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
