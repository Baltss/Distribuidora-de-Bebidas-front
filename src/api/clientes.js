// ===============================
// FILE: src/api/clientes.js
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
 * Listado de clientes (con filtros/paginación)
 * Filtros soportados:
 * - q, estado, ciudad_id, localidad_id, barrio_id, vendedor_id
 * - created_desde=YYYY-MM-DD, created_hasta=YYYY-MM-DD
 * - orderBy ('nombre'|'created_at'|'updated_at'|'id'), orderDir ('ASC'|'DESC')
 * - page, limit
 */
export async function listClientes(params = {}) {
  const { data } = await http.get(`/clientes${toQS(params)}`);
  return data; // { data, meta }
}

/** Detalle por ID (incluye geografía + vendedor_preferido) */
export async function getCliente(id) {
  const { data } = await http.get(`/clientes/${id}`);
  return data;
}

/** Crear cliente */
export async function createCliente(payload) {
  const { data } = await http.post('/clientes', payload);
  return data;
}

/** Actualizar cliente (PUT) */
export async function updateCliente(id, payload) {
  const { data } = await http.put(`/clientes/${id}`, payload);
  return data;
}

/** Cambiar estado (activo/inactivo) */
export async function patchClienteEstado(id, body = {}) {
  const { data } = await http.patch(`/clientes/${id}/estado`, body);
  return data;
}

/**
 * Eliminar cliente
 * - Soft delete por defecto (sin query)
 * - Hard delete pasando { hard: 1 }
 */
export async function deleteCliente(id, opts = {}) {
  const res = await http.delete(`/clientes/${id}${toQS(opts)}`);
  if (res.status === 204)
    return { ok: true, message: 'Se borró correctamente.' };
  return {
    ok: true,
    ...(res.data || {}),
    message: res.data?.message || 'Se borró correctamente.'
  };
}

/** Descarga el Excel con todos los clientes (dispara el guardado en el navegador) */
export async function exportClientesXlsx(params = {}) {
  const res = await http.get(`/clientes/export/xlsx${toQS(params)}`, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'clientes.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default {
  listClientes,
  getCliente,
  createCliente,
  updateCliente,
  patchClienteEstado,
  deleteCliente,
  exportClientesXlsx
};
