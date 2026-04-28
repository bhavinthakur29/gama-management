import axios from 'axios';

export const api = axios.create({
  baseURL: 'https://gama-management.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gama_token');
  console.log('Sending Token:', token);

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});
