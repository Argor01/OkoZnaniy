/**
 * API Configuration
 * Централизованная конфигурация для API endpoints
 */

console.log('🔍 VITE_API_URL from env:', import.meta.env.VITE_API_URL);
console.log('🔍 All env vars:', import.meta.env);
console.log('🔍 NODE_ENV:', import.meta.env.NODE_ENV);
console.log('🔍 DEV mode:', import.meta.env.DEV);

// Получаем базовый URL API из переменной окружения или используем текущий origin
// Всегда используем тот же протокол что и сайт (http/https)
const getApiBaseUrl = () => {
  console.log('🔍 VITE_API_URL from env:', import.meta.env.VITE_API_URL);
  console.log('🔍 All env vars:', import.meta.env);
  
  if (import.meta.env.VITE_API_URL) {
    console.log('✅ Using VITE_API_URL:', import.meta.env.VITE_API_URL);
    return import.meta.env.VITE_API_URL;
  }
  // Принудительно используем localhost:8000 для разработки
  console.log('⚠️ Using fallback URL: http://localhost:8000');
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();

// Полный URL для API endpoints
export const API_URL = `${API_BASE_URL}/api`;

// Выводим информацию о версии и конфигурации
console.log('🚀 Frontend Version: 2.1.0 (avatar upload fix)');
console.log('🔗 API Base URL:', API_BASE_URL);
console.log('🔗 API URL:', API_URL);
console.log('📅 Build Date:', new Date().toISOString());

// Вспомогательная функция для получения полного URL медиа файлов
export const getMediaUrl = (path: string | undefined | null): string | undefined => {
  if (!path) return undefined;
  // Если путь уже полный URL, возвращаем как есть
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  // Иначе добавляем базовый URL
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export default {
  API_BASE_URL,
  API_URL,
  getMediaUrl,
};
