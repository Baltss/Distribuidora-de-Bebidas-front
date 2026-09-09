// src/api/locales.js
// Cliente API para Locales (sucursales)

import http from './http';

const toQS = (params = {}) => {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== ''
  );
  return entries.length
    ? `?${new URLSearchParams(Object.fromEntries(entries)).toString()}`
    : '';
};

export async function listLocales(params = {}) {
  const { data } = await http.get(`/locales${toQS(params)}`);
  return data; // puede venir {data, meta} o array (compat)
}

export async function createLocal(payload) {
  const { data } = await http.post('/locales', payload);
  return data;
}

export async function updateLocal(id, payload) {
  const { data } = await http.put(`/locales/${id}`, payload);
  return data;
}

export async function deleteLocal(id) {
  const res = await http.delete(`/locales/${id}`);
  if (res.status === 204)
    return { ok: true, message: 'Se borró correctamente.' };
  return {
    ok: true,
    ...(res.data || {}),
    message: res.data?.message || 'Se borró correctamente.'
  };
}

export async function updateLocalEstado(id, estado) {
  const { data } = await http.patch(`/locales/${id}/estado`, { estado });
  return data;
}

export default { listLocales, createLocal, updateLocal, deleteLocal, updateLocalEstado };
