import axios from 'axios';

const axiosWithAuth = () => {
  const token = localStorage.getItem('authToken');
  return axios.create({
    baseURL:
      import.meta.env.VITE_API_BASE_URL ||
      import.meta.env.VITE_API_URL ||
      'http://localhost:8080',
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  });
};

export default axiosWithAuth;
