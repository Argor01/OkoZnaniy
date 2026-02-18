import axios from 'axios';

// Настройка axios для игнорирования 401 ошибок от admin-panel до авторизации
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Игнорируем 401 ошибки от admin-panel эндпоинтов если нет токена
    if (
      error.response?.status === 401 &&
      error.config?.url?.includes('/api/admin-panel/') &&
      !localStorage.getItem('access_token')
    ) {
      // Тихо игнорируем ошибку - это нормально, пользователь еще не залогинен
      return Promise.reject({ ...error, silent: true });
    }
    
    return Promise.reject(error);
  }
);

export default axios;
