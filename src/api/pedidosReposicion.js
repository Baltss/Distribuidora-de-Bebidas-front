// src/api/pedidosReposicion.js
// cliente API para Pedidos de reposición (listado de reposición guardado)

import http from './http';
import { toQS } from './productos.js';

/** { data: [...], pendientes } — estado: pendiente | recibido | anulado */
export async function listPedidosReposicion(params = {}) {
  const { data } = await http.get(`/pedidos-reposicion${toQS(params)}`);
  return data;
}

/** { pedido: { ..., items:[{ producto_id, cantidad, costo_unit, producto }] } } */
export async function getPedidoReposicion(id) {
  const { data } = await http.get(`/pedidos-reposicion/${id}`);
  return data;
}

/** payload: { proveedor_id?, observaciones?, items:[{ producto_id, cantidad, costo_unit? }] } */
export async function createPedidoReposicion(payload) {
  const { data } = await http.post('/pedidos-reposicion', payload);
  return data;
}

export async function updatePedidoReposicion(id, payload) {
  const { data } = await http.put(`/pedidos-reposicion/${id}`, payload);
  return data;
}

export async function anularPedidoReposicion(id) {
  const { data } = await http.patch(`/pedidos-reposicion/${id}/anular`);
  return data;
}

export default {
  listPedidosReposicion,
  getPedidoReposicion,
  createPedidoReposicion,
  updatePedidoReposicion,
  anularPedidoReposicion
};
