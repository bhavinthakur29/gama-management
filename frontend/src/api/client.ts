import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'https://gama-management.onrender.com/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('gama_token');
  const userId = localStorage.getItem('gama_auth_user_id');
  const tokenExpiresAt = localStorage.getItem('gama_token_expires_at');

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  if (userId) {
    config.headers['x-instructor-profile-id'] = userId;
  }

  if (tokenExpiresAt) {
    config.headers['x-instructor-session-expires-at'] = tokenExpiresAt;
  }

  return config;
});
