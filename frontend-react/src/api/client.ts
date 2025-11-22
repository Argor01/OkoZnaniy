import axios from 'axios';
import { API_URL } from '../config/api';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Добавляем токен к каждому запросу, кроме auth/регистрации
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

  // Эндпоинты аутентификации, для которых не нужен Authorization
  const normalizedUrl = url.toString();
  const isAuthEndpoint =
    normalizedUrl.includes('/users/token') || // /users/token/ и /users/token/refresh/
    (normalizedUrl.endsWith('/users/') && method === 'post'); // регистрация

  if (token && !isAuthEndpoint) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Обрабатываем ошибки аутентификации
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
