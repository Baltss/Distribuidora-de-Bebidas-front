// src/utils/sesion.js
// Sesión vencida: el backend responde 401 cuando falta el token o venció (un 403 es "tenés sesión
// pero no permiso"). En ese caso se limpia la sesión y se vuelve al login una sola vez.

import { getSucursalActivaId } from './sucursalActiva';

const CLAVES_SESION = ['authToken', 'userId', 'userName', 'userEmail', 'userLevel', 'userLocalId', 'userIsReemplazante', 'sucursalActivaId'];
let redirigiendo = false;

export function cerrarSesionVencida() {
  if (redirigiendo) return;
  redirigiendo = true;
  try {
    CLAVES_SESION.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // sin acceso al storage: igual se redirige
  }
  window.location.assign('/login');
}

/**
 * Agrega a una instancia de axios (o al axios global) el cierre de sesión ante un 401 con sesión iniciada y el
 * encabezado de la sucursal elegida (X-Sucursal-Id). El servidor lo ignora para quien tiene sucursal fija.
 */
export function instalarManejoDeSesion(axiosInstancia) {
  axiosInstancia.interceptors.request.use((config) => {
    const sucursal = getSucursalActivaId();
    if (/^\d+$/.test(sucursal) && sessionStorage.getItem('authToken')) {
      config.headers = config.headers || {};
      // Un pedido que ya fija su sucursal (p. ej. precios de cada sucursal) conserva la suya.
      const propia = config.headers.get ? config.headers.get('X-Sucursal-Id') : config.headers['X-Sucursal-Id'];
      if (!propia) config.headers['X-Sucursal-Id'] = sucursal;
    }
    return config;
  });
  axiosInstancia.interceptors.response.use(
    (resp) => resp,
    (error) => {
      if (error?.response?.status === 401 && sessionStorage.getItem('authToken')) cerrarSesionVencida();
      return Promise.reject(error);
    }
  );
}
