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
    console.log('🔑 Отправка запроса с токеном:', {
      url: config.url,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'нет токена'
    });
  } else if (!token && !isAuthEndpoint) {
    console.warn('⚠️ Запрос без токена:', config.url);
  }
  return config;
});

// Обрабатываем ошибки аутентификации
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Если ошибка 401 и это не повторный запрос
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Пытаемся обновить токен
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/users/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          // Повторяем оригинальный запрос с новым токеном
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Если обновление токена не удалось, очищаем и редиректим
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Для других ошибок 401 (например, refresh token истек)
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export default apiClient;
