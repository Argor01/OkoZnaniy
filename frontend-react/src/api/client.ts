import axios from 'axios';
import { API_URL } from '../config/api';
import { ROUTES } from '../utils/constants';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

const redirectToLoginIfAllowed = () => {
  if (window.location.pathname.startsWith(ROUTES.admin.root)) return;
  window.location.assign(ROUTES.login);
};


apiClient.interceptors.request.use((config) => {

  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers) {
      delete (config.headers as any)['Content-Type'];
      delete (config.headers as any)['content-type'];
    }
  }

  const token = localStorage.getItem('access_token');
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

  
  const normalizedUrl = url.toString();
  const isAuthEndpoint =
    normalizedUrl.includes('/users/token') || 
    normalizedUrl.includes('/users/telegram_auth') ||
    normalizedUrl.includes('/users/verify_email_code') ||
    normalizedUrl.includes('/users/resend_verification_code') ||
    (normalizedUrl.endsWith('/users/') && method === 'post'); 

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


apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/users/token/refresh/`, {
            refresh: refreshToken,
          });

          const { access } = response.data;
          localStorage.setItem('access_token', access);

          
          originalRequest.headers.Authorization = `Bearer ${access}`;
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');

        redirectToLoginIfAllowed();
        return Promise.reject(refreshError);
      }
    }

    
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');

      redirectToLoginIfAllowed();
    }

    return Promise.reject(error);
  }
);

export default apiClient;
