// src/utils/fechaCalendario.js
// Formatea fechas que llegan como string de calendario puro 'YYYY-MM-DD'
// (ej. un campo DATEONLY de Sequelize, como fecha_jornada de una caja) SIN
// pasar por `new Date(...)`.
//
// Por qué: `new Date('2026-08-04')` se interpreta como medianoche UTC, y
// `.toLocaleDateString()` la vuelve a mostrar en el huso horario del
// navegador. En Argentina (UTC-3) esa medianoche UTC cae en las 21:00 del
// día anterior, así que la pantalla mostraba "ayer" en vez de "hoy".
// Acá parseamos año/mes/día a mano, sin que ningún reloj/huso horario se
// meta en el medio.

/** 'YYYY-MM-DD' (o un datetime que empiece así) -> 'DD/MM/AAAA'. Si no matchea el patrón, devuelve el valor tal cual (o '—' si viene vacío). */
export function formatFechaCalendario(fechaISO) {
  if (!fechaISO) return '—';
  const m = String(fechaISO).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(fechaISO);
  const [, y, mo, d] = m;
  return `${d}/${mo}/${y}`;
}

/** Igual que formatFechaCalendario pero sin el año: 'YYYY-MM-DD' -> 'DD/MM'. */
export function formatFechaCalendarioCorta(fechaISO) {
  if (!fechaISO) return '';
  const m = String(fechaISO).match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return String(fechaISO);
  const [, , mo, d] = m;
  return `${d}/${mo}`;
}

export default formatFechaCalendario;
