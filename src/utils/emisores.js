// src/utils/emisores.js
// Ayudas para mostrar y elegir el CUIT (emisor) con el que se factura.

/** 20123456786 → 20-12345678-6 */
export const formatearCuit = (cuit) => {
  const s = String(cuit || '').replace(/\D/g, '');
  return s.length === 11 ? `${s.slice(0, 2)}-${s.slice(2, 10)}-${s.slice(10)}` : s;
};

/** Nombre con el que se reconoce un CUIT: el interno, si no la razón social, si no el número. */
export const nombreEmisor = (e) => e?.alias || e?.razon_social || formatearCuit(e?.cuit);

/**
 * Puntos de venta por los que hoy se puede facturar, con su CUIT:
 * [{ id, numero, descripcion, emisor }].
 */
export const opcionesPuntoVenta = (estadoEmision) =>
  (estadoEmision?.emisores || [])
    .filter((e) => e.habilitado)
    .flatMap((e) => e.puntos_venta.map((pv) => ({ ...pv, emisor: e })));

/** "PV 0001 · Sociedad (CUIT 30-50001091-2)" */
export const etiquetaPuntoVenta = (opcion) =>
  `PV ${String(opcion.numero).padStart(4, '0')} · ${nombreEmisor(opcion.emisor)} (CUIT ${formatearCuit(opcion.emisor.cuit)})`;
