// src/api/gastos.js
// cliente API para Gastos

import http from './http';

const toQS = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([_, v]) => v !== undefined && v !== null && v !== ''
  );
  if (!entries.length) return '';
  const s = new URLSearchParams();
  for (const [k, v] of entries) s.append(k, String(v));
  return `?${s.toString()}`;
};

/**
 * Listado de gastos con filtros y paginación
 * Ej: listGastos({ categoria_id, desde, hasta, page: 1, limit: 20 })
 */
export async function listGastos(params = {}) {
  const { data } = await http.get(`/gastos${toQS(params)}`);
  return data;
}

/** Resumen de gastos agrupado por categoría, para gráficos */
export async function getGastosResumen(params = {}) {
  const { data } = await http.get(`/gastos/resumen${toQS(params)}`);
  return data;
}

/**
 * Alta de gasto
 * payload esperado: { categoria_id, proveedor_id?, fecha, monto, descripcion, medio_pago }
 */
export async function createGasto(payload) {
  const { data } = await http.post('/gastos', payload);
  return data;
}

export async function updateGasto(id, payload) {
  const { data } = await http.put(`/gastos/${id}`, payload);
  return data;
}

export async function deleteGasto(id) {
  const res = await http.delete(`/gastos/${id}`);
  if (res.status === 204)
    return { ok: true, message: 'Se borró correctamente.' };
  return {
    ok: true,
    ...(res.data || {}),
    message: res.data?.message || 'Se borró correctamente.'
  };
}

export default {
  listGastos,
  getGastosResumen,
  createGasto,
  updateGasto,
  deleteGasto
};
