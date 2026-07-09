// src/api/compras.js
// cliente API para Compras a proveedor

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
 * Listado de compras con filtros y paginación
 * Ej: listCompras({ proveedor_id: 3, tipo_pago: 'cuenta_corriente', page: 1 })
 */
export async function listCompras(params = {}) {
  const { data } = await http.get(`/compras${toQS(params)}`);
  return data;
}

export async function getCompra(id) {
  const { data } = await http.get(`/compras/${id}`);
  return data;
}

/**
 * Alta de compra
 * payload esperado: { proveedor_id, fecha, nro_factura, tipo_pago, observaciones,
 *   items: [{ producto_id, cantidad, costo_unit }] }
 */
export async function createCompra(payload) {
  const { data } = await http.post('/compras', payload);
  return data;
}

export async function anularCompra(id) {
  const { data } = await http.patch(`/compras/${id}/anular`);
  return data;
}

export default {
  listCompras,
  getCompra,
  createCompra,
  anularCompra
};
