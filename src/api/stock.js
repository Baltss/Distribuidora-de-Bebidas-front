// src/api/stock.js
// cliente API para Stock (movimientos, stock actual, ajustes)

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
 * Listado de movimientos de stock (kardex)
 * Ej: listStockMovimientos({ producto_id: 5, page: 1, limit: 30 })
 */
export async function listStockMovimientos(params = {}) {
  const { data } = await http.get(`/stock/movimientos${toQS(params)}`);
  return data;
}

/** Stock actual de un producto puntual */
export async function getStockProducto(productoId) {
  const { data } = await http.get(`/productos/${productoId}/stock`);
  return data;
}

/**
 * Resumen de stock de todos los productos activos
 * Ej: getStockResumen({ stock_bajo: 1 })
 */
export async function getStockResumen(params = {}) {
  const { data } = await http.get(`/stock/resumen${toQS(params)}`);
  return data;
}

/**
 * Ajuste manual de stock
 * payload esperado: { producto_id, cantidad (signada), tipo?, fecha?, descripcion? }
 */
export async function createStockAjuste(payload) {
  const { data } = await http.post('/stock/ajustes', payload);
  return data;
}

export default {
  listStockMovimientos,
  getStockProducto,
  getStockResumen,
  createStockAjuste
};
