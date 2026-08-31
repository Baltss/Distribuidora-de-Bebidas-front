import axios from 'axios';
import { API_BASE_URL } from '../api/apiBase';

const axiosWithAuth = () => {
  const token = sessionStorage.getItem('authToken');
  return axios.create({
    baseURL: API_BASE_URL,
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  });
};

export default axiosWithAuth;
