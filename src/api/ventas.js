// ===============================
// FILE: src/api/ventas.js
// ===============================

import http from './http';

// QS helper local para evitar dependencias
const toQS = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  return entries.length
    ? `?${new URLSearchParams(Object.fromEntries(entries)).toString()}`
    : '';
};

/**
 * Listado de ventas (con filtros/paginación)
 * Filtros soportados (según backend):
 * - q: busca por cliente (nombre, documento, email)
 * - cliente_id, vendedor_id
 * - tipo: 'contado' | 'fiado' | 'a_cuenta'
 * - estado: 'confirmada' | 'anulada'
 * - desde=YYYY-MM-DD, hasta=YYYY-MM-DD (por fecha de la venta)
 * - include: 'items' (para traer items embebidos)
 * - orderBy: 'fecha' | 'total_neto' | 'created_at' | 'id'
 * - orderDir: 'ASC' | 'DESC'
 * - page, limit
 */
export async function listVentas(params = {}) {
  const { data } = await http.get(`/ventas${toQS(params)}`);
  return data; // { data, meta }
}

/** Detalle de venta por ID (incluye cliente, vendedor e items) */
export async function getVenta(id, params = {}) {
  const { data } = await http.get(`/ventas/${id}${toQS(params)}`);
  return data; // venta completa
}

/**
 * Crear venta (solo cabecera, total_neto inicia en 0 en el backend)
 * Payload esperado:
 * {
 *   cliente_id: number,
 *   vendedor_id: number,
 *   fecha?: string | Date,
 *   tipo?: 'contado'|'fiado'|'a_cuenta',
 *   observaciones?: string
 * }
 */
export async function createVenta(payload) {
  const { data } = await http.post('/ventas', payload);
  return data; // venta con includes
}

/** Actualizar venta (cabecera) */
export async function updateVenta(id, payload) {
  const { data } = await http.put(`/ventas/${id}`, payload);
  return data; // venta actualizada
}

/** Anular venta (PATCH /ventas/:id/anular) */
export async function anularVenta(id) {
  const { data } = await http.patch(`/ventas/${id}/anular`);
  return data; // venta ya en estado 'anulada'
}

/**
 * Eliminar venta
 * - Soft delete por defecto (sin query: cambia a 'anulada')
 * - Hard delete pasando { hard: 1 } → DELETE definitivo
 */
export async function deleteVenta(id, opts = {}) {
  const res = await http.delete(`/ventas/${id}${toQS(opts)}`);
  if (res.status === 204) {
    return { ok: true, message: 'Venta eliminada correctamente.' };
  }
  return {
    ok: true,
    ...(res.data || {}),
    message: res.data?.message || 'Venta eliminada correctamente.'
  };
}

/** Forzar recálculo de total_neto en base al detalle */
export async function recalcVentaTotal(ventaId) {
  const { data } = await http.post(`/ventas/${ventaId}/recalcular`);
  return data; // { ok: true, total_neto }
}

// ===============================
// Detalle de ventas (ventas_detalle)
// ===============================

/** Listar items de una venta */
export async function listVentaItems(ventaId) {
  const { data } = await http.get(`/ventas/${ventaId}/items`);
  return data; // { data: items[] }
}

/**
 * Agregar ítems a una venta
 * Acepta:
 * - payload = { producto_id, cantidad, precio_unit }
 * - o payload = [{...}, {...}]
 * - o payload = { items: [{...}, {...}] }
 */
export async function addVentaItems(ventaId, payload) {
  const { data } = await http.post(`/ventas/${ventaId}/items`, payload);
  return data; // { data: items[] } (detalle completo actualizado)
}

/** Actualizar un ítem puntual de la venta */
export async function updateVentaItem(ventaId, itemId, payload) {
  const { data } = await http.put(
    `/ventas/${ventaId}/items/${itemId}`,
    payload
  );
  return data; // { data: items[] }
}

/** Eliminar un ítem puntual de la venta */
export async function deleteVentaItem(ventaId, itemId) {
  const res = await http.delete(`/ventas/${ventaId}/items/${itemId}`);
  if (res.status === 204) {
    return { ok: true, message: 'Ítem eliminado correctamente.' };
  }
  // Si algún día devolvés algo en el body:
  return {
    ok: true,
    ...(res.data || {}),
    message: res.data?.message || 'Ítem eliminado correctamente.'
  };
}

/**
 * Reemplazar completamente el detalle de una venta
 * - payload = [{ producto_id, cantidad, precio_unit }, ...]
 * - o payload = { items: [...] }
 */
export async function replaceVentaItems(ventaId, payload) {
  const { data } = await http.post(`/ventas/${ventaId}/items/replace`, payload);
  return data; // { data: items[] }
}

// POST /ventas/reparto-masiva
export async function  createVentasRepartoMasiva(payload) {
  http.post('/ventas/reparto-masiva', payload).then((r) => r.data);
}
//  - 25/02/2026 - API para registrar saldo previo individual en CxC (deuda histórica sin productos).
export const createSaldoPrevioCliente = async (payload) => {
  const { data } = await http.post('/ventas/saldo-previo', payload);
  return data;
};

//  - 25/02/2026 - API para registrar saldos previos masivos en CxC (múltiples clientes en un lote).
export const createSaldosPreviosMasiva = async (payload) => {
  const { data } = await http.post('/ventas/saldos-previos-masiva', payload);
  return data;
};
export default {
  listVentas,
  getVenta,
  createVenta,
  updateVenta,
  anularVenta,
  deleteVenta,
  recalcVentaTotal,
  listVentaItems,
  addVentaItems,
  updateVentaItem,
  deleteVentaItem,
  createVentasRepartoMasiva,
  createSaldoPrevioCliente,
  createSaldosPreviosMasiva
};
