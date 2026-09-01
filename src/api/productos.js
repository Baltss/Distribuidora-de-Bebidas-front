// src/api/productos.js
// cliente API para Productos

import http from './http';

// Arma querystring ignorando null/undefined/''
export const toQS = (obj = {}) => {
  const entries = Object.entries(obj).filter(
    ([_, v]) => v !== undefined && v !== null && v !== ''
  );
  if (!entries.length) return '';
  const s = new URLSearchParams();
  for (const [k, v] of entries) s.append(k, String(v));
  return `?${s.toString()}`;
};
/**
 * Listado de productos con filtros y paginación (page/limit, offset/limit o keyset)
 * Ej: listProductos({ q: 'Agua', estado: 'activo', presentacion: 'pack', page: 1, limit: 18 })
 */
export async function listProductos(params = {}) {
  const { data } = await http.get(`/productos${toQS(params)}`);
  return data; // puede ser array o { data, meta } según tu backend
}

/**
 * Alta de producto
 * payload esperado: { nombre, codigo_sku, presentacion, pack_cantidad, unidad_medida, contenido, barra_ean13, iva_porcentaje, estado, notas }
 */
export async function createProducto(payload) {
  const { data } = await http.post('/productos', payload);
  return data;
}

/**
 * Update de producto por ID
 */
export async function updateProducto(id, payload) {
  const { data } = await http.put(`/productos/${id}`, payload);
  return data;
}

/**
 * Cambiar estado (activar/desactivar) — PATCH /productos/:id/estado
 * Ej: patchProductoEstado(5, { estado: 'inactivo' })
 */
export async function patchProductoEstado(id, payload) {
  const { data } = await http.patch(`/productos/${id}/estado`, payload);
  return data;
}

/**
 * Eliminar producto
 * - Borrado duro: deleteProducto(id, { hard: 1 })
 * - Si tu backend permite otras flags (ej. forzar), las pasás en opts.
 */
export async function deleteProducto(id, opts = {}) {
  const res = await http.delete(`/productos/${id}${toQS(opts)}`);
  // 204 => sin body
  if (res.status === 204)
    return { ok: true, message: 'Se borró correctamente.' };
  return {
    ok: true,
    ...(res.data || {}),
    message: res.data?.message || 'Se borró correctamente.'
  };
}

/** Descarga el Excel con todos los productos (dispara el guardado en el navegador) */
export async function exportProductosXlsx(params = {}) {
  const res = await http.get(`/productos/export/xlsx${toQS(params)}`, {
    responseType: 'blob'
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement('a');
  a.href = url;
  a.download = 'productos.xlsx';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export default {
  listProductos,
  createProducto,
  updateProducto,
  patchProductoEstado,
  deleteProducto,
  exportProductosXlsx
};
