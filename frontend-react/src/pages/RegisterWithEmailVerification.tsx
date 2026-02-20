import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EmailVerificationForm from '../components/auth/EmailVerificationForm';
import { apiClient } from '../api/client';

const RegisterWithEmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password2: '',
    role: 'client',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromGoogle, setFromGoogle] = useState(false);

  // Проверяем, пришли ли мы из Google OAuth
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const fromParam = searchParams.get('from');
    
    if (emailParam && fromParam === 'google') {
      setFormData(prev => ({
        ...prev,
        email: emailParam
      }));
      setFromGoogle(true);
    }
  }, [searchParams]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.password !== formData.password2) {
      setError('Пароли не совпадают');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/users/', formData);
      
      // Проверяем, нужна ли верификация email
      if (response.data.email_verification_required) {
        // Переходим к шагу подтверждения
        setEmail(formData.email);
        setStep('verify');
      } else {
        // Email не требуется или уже подтвержден
        navigate('/login');
      }
    } catch (err: unknown) {
      console.error('Registration error:', err);
      const errorMessage = (() => {
        const data = (err as { response?: { data?: unknown } })?.response?.data as
          | { email?: string[]; password?: string[]; detail?: string }
          | undefined;
        return data?.email?.[0] || data?.password?.[0] || data?.detail || 'Ошибка регистрации';
      })();
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = (_user: unknown, _tokens: { access: string; refresh: string }) => {
    // Перенаправляем в зависимости от роли
    navigate('/expert');
  };

  if (step === 'verify') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-lg shadow-md">
          <EmailVerificationForm
            email={email}
            onSuccess={handleVerificationSuccess}
            onError={(error) => console.error('Verification error:', error)}
          />
          
          <div className="text-center mt-4">
            <button
              onClick={() => setStep('register')}
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              ← Вернуться к регистрации
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Регистрация
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {fromGoogle ? 'Завершите регистрацию с Google аккаунтом' : 'Создайте аккаунт на платформе OkoZnaniy'}
          </p>
          {fromGoogle && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-700">
                ✓ Email из Google: <strong>{formData.email}</strong>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Создайте пароль для завершения регистрации
              </p>
            </div>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={fromGoogle}
                className={`appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm ${fromGoogle ? 'bg-gray-100 cursor-not-allowed' : ''}`}
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Пароль
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Минимум 8 символов"
              />
            </div>

            <div>
              <label htmlFor="password2" className="block text-sm font-medium text-gray-700 mb-1">
                Подтвердите пароль
              </label>
              <input
                id="password2"
                name="password2"
                type="password"
                required
                value={formData.password2}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Повторите пароль"
              />
            </div>

            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-1">
                Я хочу
              </label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="appearance-none relative block w-full px-3 py-2 border border-gray-300 text-gray-900 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
              >
                <option value="client">Заказывать работы</option>
                <option value="expert">Выполнять работы</option>
                <option value="partner">Стать партнером</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? 'Регистрация...' : 'Зарегистрироваться'}
            </button>
          </div>

          <div className="text-center">
            <a href="/login" className="text-sm text-indigo-600 hover:text-indigo-500">
              Уже есть аккаунт? Войти
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterWithEmailVerification;
