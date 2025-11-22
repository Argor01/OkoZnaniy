/**
 * API Configuration
 * Централизованная конфигурация для API endpoints
 */

// Получаем базовый URL API из переменной окружения или используем текущий origin
export const API_BASE_URL = import.meta.env.VITE_API_URL || window.location.origin;

// Полный URL для API endpoints
export const API_URL = `${API_BASE_URL}/api`;

// Вспомогательная функция для получения полного URL медиа файлов
export const getMediaUrl = (path: string | undefined | null): string | undefined => {
  if (!path) return undefined;
  // Если путь уже полный URL, возвращаем как есть
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Иначе добавляем базовый URL
  return `${API_BASE_URL}${path}`;
};

export default {
  API_BASE_URL,
  API_URL,
  getMediaUrl,
};
