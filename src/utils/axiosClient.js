// api/axiosClient.js
import axios from 'axios';
import { API_BASE_URL } from '../api/apiBase';

const api = axios.create({
  baseURL: API_BASE_URL
});

// Interceptor para adjuntar token en cada request
api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('authToken');
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
