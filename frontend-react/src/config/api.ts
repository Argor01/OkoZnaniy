



const getApiBaseUrl = () => {
  const debugEnabled =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.localStorage?.getItem('debug_api') === '1';

  if (debugEnabled) {
    console.log('🔍 VITE_API_URL from env:', import.meta.env.VITE_API_URL);
    console.log('🔍 DEV mode:', import.meta.env.DEV);
  }

  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  return 'http://localhost:8000';
};

export const API_BASE_URL = getApiBaseUrl();


export const API_URL = `${API_BASE_URL}/api`;


export const getMediaUrl = (path: string | undefined | null): string | undefined => {
  if (!path) return undefined;
  
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE_URL}${normalizedPath}`;
};

export default {
  API_BASE_URL,
  API_URL,
  getMediaUrl,
};
