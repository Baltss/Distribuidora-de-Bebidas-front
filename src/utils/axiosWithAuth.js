import axios from 'axios';
import { API_BASE_URL } from '../api/apiBase';
import { instalarManejoDeSesion } from './sesion';

const axiosWithAuth = () => {
  const token = sessionStorage.getItem('authToken');
  const instancia = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  });
  instalarManejoDeSesion(instancia);
  return instancia;
};

export default axiosWithAuth;
