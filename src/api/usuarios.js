import http from './http';

export async function listUsuarios(params = {}) {
  const { data } = await http.get('/usuarios', { params });
  return data; // { data, meta }
}
