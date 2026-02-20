// Утилита для очистки токенов аутентификации
export const clearAuth = () => {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  localStorage.removeItem('user');
  const debugEnabled =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.localStorage?.getItem('debug_api') === '1';
  if (debugEnabled) console.log('✅ Токены очищены. Перезагрузите страницу.');
  setTimeout(() => {
    window.location.reload();
  }, 500);
};

if (import.meta.env.DEV && typeof window !== 'undefined') {
  (window as any).clearAuth = clearAuth;
  if (window.localStorage?.getItem('debug_api') === '1') {
    console.log('%c💡 Подсказка для разработки', 'color: #1890ff; font-size: 14px; font-weight: bold;');
    console.log(
      '%cЕсли возникают ошибки 401/403, выполните в консоли: %cclearAuth()',
      'color: #666; font-size: 12px;',
      'color: #52c41a; font-size: 12px; font-weight: bold;'
    );
  }
}
