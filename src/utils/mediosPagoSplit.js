// src/utils/mediosPagoSplit.js
// Helpers para el modo "dividir en varios medios de pago" (medios_pago[])
// usado en Ventas, Cobranzas, Compras y Pagos a proveedores.

let splitRowKeySeq = 0;

// Fila vacía con key estable (evita que React "recicle" inputs de otra fila).
export const makeSplitRow = () => ({
  _key: ++splitRowKeySeq,
  medio_pago: '',
  monto: ''
});

// Dos filas vacías: valor inicial al activar el modo "dividir".
export const makeInitialSplitRows = () => [makeSplitRow(), makeSplitRow()];

// Suma de las filas con medio_pago + monto válidos (> 0).
export const sumSplitRows = (rows) =>
  (rows || []).reduce((acc, r) => {
    const n = Number(r.monto);
    return acc + (Number.isFinite(n) && n > 0 ? n : 0);
  }, 0);

// Filas listas para enviar al backend como medios_pago: [{ medio_pago, monto }]
export const buildMediosPagoPayload = (rows) =>
  (rows || [])
    .filter((r) => r.medio_pago && Number(r.monto) > 0)
    .map((r) => ({ medio_pago: r.medio_pago, monto: Number(r.monto) }));

// ¿La suma de las filas coincide con el total (±0.01, igual tolerancia que el backend)?
export const splitMatchesTotal = (rows, total) => {
  const payload = buildMediosPagoPayload(rows);
  if (!payload.length) return false;
  const sum = sumSplitRows(rows);
  return Math.abs(sum - Number(total || 0)) <= 0.01;
};
