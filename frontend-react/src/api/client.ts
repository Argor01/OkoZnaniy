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
  // Если отправляем FormData (multipart), нельзя форсировать application/json.
  // Иначе браузер/axios не выставит boundary, и файл не попадёт в request.FILES на бэке.
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers) {
      delete (config.headers as any)['Content-Type'];
      delete (config.headers as any)['content-type'];
    }
  }

  const token = localStorage.getItem('access_token');
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

  // Эндпоинты аутентификации, для которых не нужен Authorization
  const normalizedUrl = url.toString();
  const isAuthEndpoint =
    normalizedUrl.includes('/users/token') || // /users/token/ и /users/token/refresh/
    normalizedUrl.includes('/users/telegram_auth') ||
    normalizedUrl.includes('/users/verify_email_code') ||
    normalizedUrl.includes('/users/resend_verification_code') ||
    (normalizedUrl.endsWith('/users/') && method === 'post'); // регистрация

  if (token && !isAuthEndpoint) {
    config.headers.Authorization = `Bearer ${token}`;
    if (import.meta.env.DEV && localStorage.getItem('debug_api') === '1') {
      console.log('🔑 Отправка запроса с токеном:', {
        url: config.url,
        hasToken: !!token,
        tokenPreview: token ? `${token.substring(0, 8)}…` : 'нет токена',
        method,
      });
    }
  } else if (!token && !isAuthEndpoint) {
    if (import.meta.env.DEV && localStorage.getItem('debug_api') === '1') {
      console.warn('⚠️ Запрос без токена:', config.url);
    }
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
        
        // Не делаем редирект, если мы на админ-странице - пусть /admin покажет форму входа
        if (!window.location.pathname.startsWith('/admin')) {
          window.location.href = '/login';
        }
        return Promise.reject(refreshError);
      }
    }

    // Для других ошибок 401 (например, refresh token истек)
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      
      // Не делаем редирект, если мы на админ-странице - пусть /admin покажет форму входа
      if (!window.location.pathname.startsWith('/admin')) {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
