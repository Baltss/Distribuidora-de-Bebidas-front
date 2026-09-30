// src/api/apiBase.js
// Fuente ÚNICA de la URL base del backend para todo el frontend.
//
// Prioridad:
//   1. VITE_API_BASE_URL  (nombre recomendado)
//   2. VITE_API_URL       (compat histórica, algunos archivos usaban este)
//   3. URL de producción  (fallback seguro: si no hay .env, prod sigue andando)
//
// Para desarrollo local, creá un archivo `.env` en la raíz del proyecto con:
//   VITE_API_BASE_URL=http://localhost:8080
// (reiniciá `npm run dev` después de crearlo o modificarlo).

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  'https://api.soldiservicios.online';

export default API_BASE_URL;
