// src/utils/sesion.js
// Sesión vencida: el backend responde 401 cuando falta el token o venció (un 403 es "tenés sesión
// pero no permiso"). En ese caso se limpia la sesión y se vuelve al login una sola vez.

const CLAVES_SESION = ['authToken', 'userId', 'userName', 'userEmail', 'userLevel', 'userLocalId', 'userIsReemplazante'];
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

/** Agrega a una instancia de axios (o al axios global) el cierre de sesión ante un 401 con sesión iniciada. */
export function instalarManejoDeSesion(axiosInstancia) {
  axiosInstancia.interceptors.response.use(
    (resp) => resp,
    (error) => {
      if (error?.response?.status === 401 && sessionStorage.getItem('authToken')) cerrarSesionVencida();
      return Promise.reject(error);
    }
  );
}
