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

/** Listado de movimientos de caja con filtros y paginación */
export async function listCajaMovimientos(params = {}) {
  const { data } = await http.get(`/caja/movimientos${toQS(params)}`);
  return data;
}

/** Saldo actual + totales del período + serie diaria (para el gráfico) */
export async function getCajaResumen(params = {}) {
  const { data } = await http.get(`/caja/resumen${toQS(params)}`);
  return data;
}

/** Alta manual: { tipo: 'ingreso' | 'egreso', fecha, monto, descripcion, medio_pago? } */
export async function createCajaMovimientoManual(payload) {
  const { data } = await http.post('/caja/movimientos', payload);
  return data;
}

export async function deleteCajaMovimientoManual(id) {
  const res = await http.delete(`/caja/movimientos/${id}`);
  if (res.status === 204) return { ok: true, message: 'Se borró correctamente.' };
  return { ok: true, ...(res.data || {}), message: res.data?.message || 'Se borró correctamente.' };
}

export default {
  listCajaMovimientos,
  getCajaResumen,
  createCajaMovimientoManual,
  deleteCajaMovimientoManual
};
