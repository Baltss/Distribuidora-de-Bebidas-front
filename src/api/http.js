// ===============================
// FILE: src/api/http.js
// ===============================
import axios from 'axios';
import { getUserId } from '../utils/authUtils';

const BASE_URL = import.meta?.env?.VITE_API_BASE_URL || 'http://localhost:8080';

const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  timeout: 20000
});

/** Inyecta usuario_log_id en TODAS las requests */
http.interceptors.request.use((config) => {
  const raw = getUserId?.();
  const uid = raw != null ? Number(raw) : null; // asegurar número
  if (!uid || Number.isNaN(uid)) return config;

  const method = (config.method || 'get').toLowerCase();

  const ensureBodyWithUser = () => {
    if (config.data instanceof FormData) {
      if (!config.data.has('usuario_log_id')) {
        config.data.append('usuario_log_id', uid);
      }
    } else {
      const body =
        config.data && typeof config.data === 'object' ? config.data : {};
      if (!('usuario_log_id' in body)) {
        config.data = { ...body, usuario_log_id: uid };
      } else {
        config.data = body;
      }
    }
  };

  const ensureParamsWithUser = () => {
    const curr =
      config.params && typeof config.params === 'object' ? config.params : {};
    if (!('usuario_log_id' in curr)) {
      config.params = { ...curr, usuario_log_id: uid };
    } else {
      config.params = curr;
    }
  };

  if (method === 'get' || method === 'head' || method === 'delete') {
    ensureParamsWithUser();
  } else {
    ensureBodyWithUser();
  }

  return config;
});

/** Normaliza errores del backend y de red */
http.interceptors.response.use(
  (resp) => resp, // 2xx pasa
  (error) => {
    // Si el backend ya manda un objeto estándar, propagarlo
    const std = error?.response?.data;
    if (std && (std.mensajeError || std.code || std.ok === false)) {
      return Promise.reject(std);
    }
    // Errores de red / CORS / timeout
    return Promise.reject({
      ok: false,
      code: 'NETWORK',
      mensajeError: 'No se pudo conectar con el servidor',
      tips: ['Verificá tu conexión y reintentá.'],
      details: {
        status: error?.response?.status ?? null,
        reason: error?.message ?? 'desconocido'
      }
    });
  }
);

export default http;
