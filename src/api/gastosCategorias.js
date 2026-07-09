// src/api/gastosCategorias.js
// cliente API para Categorías de Gasto

import http from './http';

export async function listGastosCategorias(params = {}) {
  const { data } = await http.get('/gastos/categorias', { params });
  return data;
}

export async function createGastoCategoria(payload) {
  const { data } = await http.post('/gastos/categorias', payload);
  return data;
}

export async function updateGastoCategoria(id, payload) {
  const { data } = await http.put(`/gastos/categorias/${id}`, payload);
  return data;
}

export default {
  listGastosCategorias,
  createGastoCategoria,
  updateGastoCategoria
};
