// src/utils/sucursalActiva.js
// Sucursal con la que opera el usuario (docs/sucursales.md del backend).
//
// - Administrativo y vendedor trabajan siempre en la suya: el servidor la fija, acá no se elige nada.
// - Administrador (socio), contador y soldi_admin eligen: una sucursal puntual o "Todas" (consolidado, sólo
//   lectura). La elección viaja en el encabezado X-Sucursal-Id de cada pedido (ver sesion.js).

const CLAVE = 'sucursalActivaId';
const EVENTO = 'sucursal-activa-cambio';

/** Roles que pueden ver todas las sucursales y elegir con cuál operan. */
export const ROLES_CON_TODAS = ['socio', 'contador', 'soldi_admin'];

export const veTodasLasSucursales = (rol) => ROLES_CON_TODAS.includes(String(rol || '').trim().toLowerCase());

/** Id de la sucursal elegida; 'todas' si eligió el consolidado; '' si todavía no eligió. */
export function getSucursalActivaId() {
  try {
    return sessionStorage.getItem(CLAVE) || '';
  } catch {
    return '';
  }
}

export const SUCURSAL_TODAS = 'todas';

export function setSucursalActivaId(id) {
  try {
    if (id === '' || id == null) sessionStorage.removeItem(CLAVE);
    else sessionStorage.setItem(CLAVE, String(id));
  } catch {
    // sin acceso al storage: la elección dura lo que dura la pantalla
  }
  window.dispatchEvent(new Event(EVENTO));
}

export function limpiarSucursalActiva() {
  try {
    sessionStorage.removeItem(CLAVE);
  } catch {
    // nada que limpiar
  }
}

export const onSucursalActivaCambio = (fn) => {
  window.addEventListener(EVENTO, fn);
  return () => window.removeEventListener(EVENTO, fn);
};
