// src/api/locales.js
// Cliente API para Locales (sucursales)

import http from './http';

export async function listLocales() {
  const { data } = await http.get('/locales');
  return data;
}

export default { listLocales };
