// src/api/caja.js
// Cliente API para Caja y Finanzas

import http from './http';

const toQS = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  if (!entries.length) return '';
  const s = new URLSearchParams();
  for (const [k, v] of entries) s.append(k, String(v));
  return `?${s.toString()}`;
};

/** Caja (jornada) de hoy — la abre automáticamente si todavía no existe. params: { local_id? } */
export async function getCajaActual(params = {}) {
  const { data } = await http.get(`/caja/actual${toQS(params)}`);
  return data;
}

/** A qué jornada correspondería un movimiento con esa fecha */
export async function getCajaPorFecha(fecha, localId) {
  const { data } = await http.get(`/caja/por-fecha${toQS({ fecha, local_id: localId })}`);
  return data;
}

/** Historial de cajas (jornadas) paginado, con filtros { estado, desde, hasta } */
export async function listCajasHistorial(params = {}) {
  const { data } = await http.get(`/caja/historial${toQS(params)}`);
  return data;
}

/** Detalle completo de una caja puntual (resumen + sus movimientos) */
export async function getCajaDetalle(id) {
  const { data } = await http.get(`/caja/${id}`);
  return data;
}

/** Cierre manual de una caja. { efectivo_contado, observaciones? } — sólo Administrador */
export async function cerrarCaja(id, payload) {
  const { data } = await http.post(`/caja/${id}/cerrar`, payload);
  return data;
}

/** Listado de movimientos de caja con filtros y paginación */
export async function listCajaMovimientos(params = {}) {
  const { data } = await http.get(`/caja/movimientos${toQS(params)}`);
  return data;
}

/** Saldo actual + totales del período + desglose por medio de pago + serie diaria */
export async function getCajaResumen(params = {}) {
  const { data } = await http.get(`/caja/resumen${toQS(params)}`);
  return data;
}

/** Alta manual: { tipo: 'ingreso' | 'egreso', fecha, monto, descripcion, medio_pago } */
export async function createCajaMovimientoManual(payload) {
  const { data } = await http.post('/caja/movimientos', payload);
  return data;
}

/** Edición de un movimiento manual (no anulado): { fecha?, monto?, descripcion?, medio_pago? } */
export async function updateCajaMovimientoManual(id, payload) {
  const { data } = await http.put(`/caja/movimientos/${id}`, payload);
  return data;
}

/** Anulación reversible de un movimiento manual (nunca se borra) */
export async function anularCajaMovimiento(id, motivo) {
  const { data } = await http.patch(`/caja/movimientos/${id}/anular`, { motivo });
  return data;
}

/** Historial de ediciones de un movimiento manual */
export async function getCajaMovimientoHistorial(id) {
  const { data } = await http.get(`/caja/movimientos/${id}/historial`);
  return data;
}

export default {
  getCajaActual,
  getCajaPorFecha,
  listCajasHistorial,
  getCajaDetalle,
  cerrarCaja,
  listCajaMovimientos,
  getCajaResumen,
  createCajaMovimientoManual,
  updateCajaMovimientoManual,
  anularCajaMovimiento,
  getCajaMovimientoHistorial
};
