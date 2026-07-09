// src/api/pagosProveedores.js
// cliente API para Pagos a Proveedores

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
 * Listado de pagos a proveedores
 * Ej: listPagosProveedores({ proveedor_id: 3, fecha_desde, fecha_hasta })
 */
export async function listPagosProveedores(params = {}) {
  const { data } = await http.get(`/pagos-proveedores${toQS(params)}`);
  return data;
}

export async function getPagoProveedor(id) {
  const { data } = await http.get(`/pagos-proveedores/${id}`);
  return data;
}

/**
 * Alta de pago a proveedor (aplica FIFO contra compras abiertas)
 * payload esperado: { proveedor_id, fecha, total_pagado, medio_pago, observaciones }
 */
export async function createPagoProveedor(payload) {
  const { data } = await http.post('/pagos-proveedores', payload);
  return data;
}

export async function deletePagoProveedor(id) {
  const res = await http.delete(`/pagos-proveedores/${id}`);
  if (res.status === 204)
    return { ok: true, message: 'Se borró correctamente.' };
  return {
    ok: true,
    ...(res.data || {}),
    message: res.data?.message || 'Se borró correctamente.'
  };
}

export default {
  listPagosProveedores,
  getPagoProveedor,
  createPagoProveedor,
  deletePagoProveedor
};
