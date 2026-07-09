// src/api/proveedores.js
// cliente API para Proveedores

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
 * Listado de proveedores con filtros y paginación
 * Ej: listProveedores({ q: 'Distribuidora', estado: 'activo', page: 1, limit: 18 })
 */
export async function listProveedores(params = {}) {
  const { data } = await http.get(`/proveedores${toQS(params)}`);
  return data;
}

export async function getProveedor(id) {
  const { data } = await http.get(`/proveedores/${id}`);
  return data;
}

/**
 * Alta de proveedor
 * payload esperado: { razon_social, cuit, telefono, email, direccion, condicion_pago, estado, notas }
 */
export async function createProveedor(payload) {
  const { data } = await http.post('/proveedores', payload);
  return data;
}

export async function updateProveedor(id, payload) {
  const { data } = await http.put(`/proveedores/${id}`, payload);
  return data;
}

export async function patchProveedorEstado(id, payload) {
  const { data } = await http.patch(`/proveedores/${id}/estado`, payload);
  return data;
}

export async function deleteProveedor(id, opts = {}) {
  const res = await http.delete(`/proveedores/${id}${toQS(opts)}`);
  if (res.status === 204)
    return { ok: true, message: 'Se borró correctamente.' };
  return {
    ok: true,
    ...(res.data || {}),
    message: res.data?.message || 'Se borró correctamente.'
  };
}

export default {
  listProveedores,
  getProveedor,
  createProveedor,
  updateProveedor,
  patchProveedorEstado,
  deleteProveedor
};
