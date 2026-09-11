// FILE: src/utils/fechaAR.js
//
// Por qué existe este archivo.
//
// El backend devuelve algunos campos como fecha "pelada", sin hora
// (DATEONLY de Sequelize, ej. `fecha_jornada` de una caja: '2026-09-11').
// JavaScript interpreta `new Date('2026-09-11')` como medianoche UTC, y
// esa medianoche UTC son las 21:00 del día ANTERIOR en Argentina
// (UTC-3). Si después se formatea con `.toLocaleDateString('es-AR')`
// (que usa la zona horaria del navegador), el resultado muestra el día
// anterior al real, aunque el dato guardado en la base esté perfecto.
//
// Lo mismo pasa al revés al calcular "hoy": `new Date().toISOString()`
// da la fecha en UTC, no en hora argentina. Entre las 21:00 y las 23:59
// hora AR eso da la fecha de MAÑANA.
//
// Argentina no aplica horario de verano desde 2009, así que el offset
// se trata como fijo (-3).
//
// Estas funciones son solo para MOSTRAR fechas puras en pantalla y para
// calcular el "hoy" en hora argentina — no reemplazan el manejo de
// instantes reales (DATETIME) del backend, que ya vienen con hora
// correcta y se pueden formatear con `toLocaleDateString`/`toLocaleString`
// normal.

const AR_OFFSET_MIN = -3 * 60; // UTC-3, fijo

/** true si `s` es un string 'YYYY-MM-DD' y nada más. */
function esSoloFecha(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

/**
 * Fecha de HOY en hora argentina, como string 'YYYY-MM-DD'.
 * Reemplaza a los `new Date().toISOString().slice(0, 10)` dispersos por
 * el código, que dan la fecha en UTC (mal entre las 21:00 y las 23:59 AR).
 *
 * @param {Date} [fecha] - inyectable para tests.
 */
export function hoyISO(fecha = new Date()) {
  const ms = fecha.getTime() + AR_OFFSET_MIN * 60 * 1000;
  const arDate = new Date(ms);
  const yyyy = arDate.getUTCFullYear();
  const mm = String(arDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(arDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Formatea una fecha "pura" (sin hora) para mostrar en pantalla, sin
 * pasar nunca por una interpretación UTC que pueda correr el día.
 *
 * - Si `valor` es un string 'YYYY-MM-DD' (o un Date que representa una
 *   fecha sin hora), se parsea a mano y se arma con
 *   `new Date(year, month - 1, day)` — ese constructor sí usa la zona
 *   horaria LOCAL del navegador para los componentes, no UTC.
 * - Si `valor` ya trae hora/zona (un DATETIME completo), se respeta tal
 *   cual con `toLocaleDateString` normal: ahí no hay bug que evitar.
 *
 * @param {string|Date|null|undefined} valor
 * @param {Intl.DateTimeFormatOptions} [opciones]
 */
export function formatFechaSolo(valor, opciones) {
  if (!valor) return '—';

  if (esSoloFecha(valor)) {
    const [y, m, d] = valor.split('-').map(Number);
    return new Date(y, m - 1, d).toLocaleDateString('es-AR', opciones);
  }

  // String con hora/zona, timestamp o Date: se interpreta tal cual.
  const d = valor instanceof Date ? valor : new Date(valor);
  if (isNaN(d.getTime())) return '—';

  // Si viene como string 'YYYY-MM-DDTHH:mm:ss...' asumimos que ya es un
  // instante real (DATETIME) y no necesita el tratamiento especial.
  return d.toLocaleDateString('es-AR', opciones);
}

/**
 * Suma (o resta, con `dias` negativo) días de calendario a una fecha
 * 'YYYY-MM-DD', devolviendo otro string 'YYYY-MM-DD'. Es aritmética de
 * calendario pura (no instantes reales), así que usar Date.UTC acá es
 * seguro: no se compara contra ninguna zona horaria, solo se cuentan días.
 *
 * @param {string} fechaISO - 'YYYY-MM-DD'
 * @param {number} dias
 */
export function sumarDiasISO(fechaISO, dias) {
  const [y, m, d] = fechaISO.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + dias);
  return dt.toISOString().slice(0, 10);
}

export default { hoyISO, formatFechaSolo, sumarDiasISO };
