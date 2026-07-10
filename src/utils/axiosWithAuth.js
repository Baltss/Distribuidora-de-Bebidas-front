import axios from 'axios';

const axiosWithAuth = () => {
  const token = localStorage.getItem('authToken');
  return axios.create({
    baseURL: 'http://localhost:8080',
    headers: {
      Authorization: token ? `Bearer ${token}` : ''
    }
  });
};

export default axiosWithAuth;
