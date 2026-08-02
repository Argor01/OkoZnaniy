import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { notification } from 'antd';
import { API_URL } from '@/config/api';
import { ROUTES } from '@/utils/constants';
import { API_ENDPOINTS } from '@/config/endpoints';
import { logger } from '@/utils/logger';

const formatThrottleWait = (detail: string): string => {
  const match = detail.match(/(\d+)\s*seconds?/i);
  if (!match) return detail;
  const seconds = parseInt(match[1], 10);
  if (seconds < 60) return `Попробуйте через ${seconds} сек.`;
  const minutes = Math.ceil(seconds / 60);
  return `Попробуйте через ${minutes} мин.`;
};

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: true,
});

const AUTH_ENDPOINTS = [
  API_ENDPOINTS.auth.login,
  API_ENDPOINTS.auth.telegramAuth,
  API_ENDPOINTS.auth.verifyEmailCode,
  API_ENDPOINTS.auth.resendVerificationCode,
];

const isAuthEndpoint = (url: string, method: string): boolean => {
  const normalized = url.toString();
  return (
    AUTH_ENDPOINTS.some((ep) => normalized.includes(ep)) ||
    (normalized.endsWith(API_ENDPOINTS.auth.register) && method === 'post')
  );
};

const redirectToLoginIfAllowed = () => {
  if (window.location.pathname.startsWith(ROUTES.admin.root)) return;
  window.location.assign(ROUTES.login);
};

// --- Request interceptor ---
apiClient.interceptors.request.use((config) => {
  // Auto-remove Content-Type for FormData (let browser set boundary)
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    if (config.headers) {
      if (typeof (config.headers as Record<string, unknown>).delete === 'function') {
        (config.headers as unknown as Headers).delete('Content-Type');
      } else {
        delete (config.headers as Record<string, unknown>)['Content-Type'];
        delete (config.headers as Record<string, unknown>)['content-type'];
      }
    }
  }

  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();


  // Dev-mode request logging
  if (import.meta.env.DEV) {
    const startTime = Date.now();
    (config as InternalAxiosRequestConfig & { _startTime?: number })._startTime = startTime;
    logger.log(`[API] ${method.toUpperCase()} ${url}`);
  }

  return config;
});

// --- Response interceptor ---
apiClient.interceptors.response.use(
  (response) => {
    // Dev-mode response timing
    if (import.meta.env.DEV) {
      const config = response.config as InternalAxiosRequestConfig & { _startTime?: number };
      const duration = config._startTime ? Date.now() - config._startTime : 0;
      logger.log(
        `[API] ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`
      );
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // Dev-mode error logging
    if (import.meta.env.DEV) {
      const status = error.response?.status || 'NETWORK';
      const url = originalRequest?.url || 'unknown';
      logger.error(`[API] ${status} ${originalRequest?.method?.toUpperCase()} ${url}`, {
        message: error.message,
        data: error.response?.data,
      });
    }

    // 401 → try refresh token once
    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await axios.post(`${API_URL}${API_ENDPOINTS.auth.refreshToken}`, {}, { withCredentials: true });
        return apiClient(originalRequest);
      } catch {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        redirectToLoginIfAllowed();
        return Promise.reject(error);
      }
    }

    // Final 401 after refresh failed
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      redirectToLoginIfAllowed();
    }

    // 429 Too Many Requests — throttle
    if (error.response?.status === 429) {
      const data = error.response?.data as Record<string, unknown> | undefined;
      const detail = (data?.detail as string) || 'Слишком много запросов';
      const message = formatThrottleWait(detail);
      notification.warning({
        message: 'Превышен лимит запросов',
        description: message,
        duration: 6,
      });
    }

    return Promise.reject(error);
  }
);

export default apiClient;
