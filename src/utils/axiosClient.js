// api/axiosClient.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:8080'
});

// Interceptor para adjuntar token en cada request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// (Opcional) Interceptor de respuesta para manejar 401 globalmente
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      // logout/redirect/etc.
      // localStorage.removeItem('authToken');
      // window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;
