import React from 'react';
import { useNavigate } from 'react-router-dom';
import TelegramLoginButton from '../components/auth/TelegramLoginButton';

const TelegramAuthExample: React.FC = () => {
  const navigate = useNavigate();

  const handleTelegramAuth = (user: any) => {
    // Перенаправляем пользователя в зависимости от роли
    navigate('/expert');
  };

  const handleTelegramError = (error: string) => {
    console.error('Ошибка авторизации:', error);
    alert(`Ошибка: ${error}`);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Вход в систему
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Войдите через Telegram для быстрого доступа
          </p>
        </div>

        <div className="mt-8 space-y-6">
          {/* Обычная форма входа */}
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email или телефон
              </label>
              <input
                id="email-address"
                name="email"
                type="text"
                autoComplete="email"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Email или телефон"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Пароль"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Войти
            </button>
          </div>

          {/* Разделитель */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gray-50 text-gray-500">Или войдите через</span>
            </div>
          </div>

          {/* Telegram Login Button */}
          <div className="flex justify-center">
            <TelegramLoginButton
              botName="oko_expert_bot"
              buttonSize="large"
              cornerRadius={10}
              requestAccess={true}
              usePic={true}
              lang="ru"
              onAuth={handleTelegramAuth}
              onError={handleTelegramError}
            />
          </div>

          {/* Дополнительные ссылки */}
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <a href="/register" className="font-medium text-indigo-600 hover:text-indigo-500">
                Нет аккаунта? Зарегистрируйтесь
              </a>
            </div>
            <div className="text-sm">
              <a href="/reset-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Забыли пароль?
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TelegramAuthExample;
