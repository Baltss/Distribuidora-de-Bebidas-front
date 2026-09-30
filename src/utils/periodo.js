// src/utils/periodo.js
// Períodos mensuales ('AAAA-MM') en hora argentina.

/** Mes calendario en hora argentina (UTC-3), corrido `delta` meses. */
export function mesAR(delta = 0) {
  const ar = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const d = new Date(Date.UTC(ar.getUTCFullYear(), ar.getUTCMonth() + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function moverMes(periodo, delta) {
  const [a, m] = periodo.split('-').map(Number);
  const d = new Date(Date.UTC(a, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** '2026-09' → 'Septiembre 2026' */
export const nombreMes = (periodo) => {
  const [a, m] = periodo.split('-').map(Number);
  const texto = new Date(Date.UTC(a, m - 1, 1)).toLocaleDateString('es-AR', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};
