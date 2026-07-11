// src/api/categorias.js
// cliente API para Categorías de productos

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

export async function listCategorias(params = {}) {
  const { data } = await http.get(`/categorias${toQS(params)}`);
  return data; // { data: [...] }
}

export async function createCategoria(payload) {
  const { data } = await http.post('/categorias', payload);
  return data;
}

export async function updateCategoria(id, payload) {
  const { data } = await http.put(`/categorias/${id}`, payload);
  return data;
}

export async function patchCategoriaEstado(id, payload) {
  const { data } = await http.patch(`/categorias/${id}/estado`, payload);
  return data;
}

export async function deleteCategoria(id) {
  const res = await http.delete(`/categorias/${id}`);
  if (res.status === 204)
    return { ok: true, message: 'Se borró correctamente.' };
  return {
    ok: true,
    ...(res.data || {}),
    message: res.data?.message || 'Se borró correctamente.'
  };
}

export default {
  listCategorias,
  createCategoria,
  updateCategoria,
  patchCategoriaEstado,
  deleteCategoria
};
