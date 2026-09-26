// src/utils/fechaAR.js
// Formateo de fechas/horas reales (DATETIME, con hora) según el huso horario
// del navegador. Para campos DATEONLY (sólo fecha, sin hora) usar
// utils/fechaCalendario.js en su lugar.

/** '26/09/2026' */
export function formatFechaSolo(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** '26/09/2026 14:30' */
export function formatFechaHora(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export default { formatFechaSolo, formatFechaHora };
