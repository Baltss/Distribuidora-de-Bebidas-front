import http from './http';

export async function listUsuarios(params = {}) {
  const { data } = await http.get('/usuarios', { params });
  return data; // { data, meta }
}

export async function createUsuario(payload) {
  const { data } = await http.post('/usuarios', payload);
  return data;
}

export async function updateUsuario(id, payload) {
  const { data } = await http.put(`/usuarios/${id}`, payload);
  return data;
}

export async function deactivateUsuario(id, payload = {}) {
  const { data } = await http.delete(`/usuarios/${id}`, { data: payload });
  return data;
}

export async function reactivateUsuario(id, payload = {}) {
  const { data } = await http.put(`/usuarios/${id}`, {
    estado: 'activo',
    ...payload
  });
  return data;
}

export default {
  listUsuarios,
  createUsuario,
  updateUsuario,
  deactivateUsuario,
  reactivateUsuario
};
