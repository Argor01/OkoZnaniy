import React from 'react';
import { Formik, Form as FormikForm } from 'formik';
import * as Yup from 'yup';
import { TypographyH2 } from '@/components/shared/Typography';
import { useDispatch } from 'react-redux';
import { FormField } from '../shared/Form/FormField';
import { useApi } from '@/hooks/useApi';
import { setCredentials } from '@/store/slices/authSlice';
import { useRouter } from 'next/router';

 

interface LoginFormData {
  email: string;
  password: string;
}

interface LoginResponse {
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: 'client' | 'expert';
  };
  token: string;
}

export const LoginForm: React.FC = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const api = useApi();

  const handleSubmit = async (values: LoginFormData) => {
    try {
      const response = await api.post<LoginResponse>('/api/auth/login/', values);
      dispatch(setCredentials(response));
      router.push('/orders');
    } catch (error) {
      // Ошибка уже обработана в useApi
      console.error('Login error:', error);
    }
  };

  return (
    <div className="auth-card w-full max-w-[420px] mx-auto p-6 rounded-2xl bg-slate-900/90 shadow-auth text-white backdrop-blur">
      <TypographyH2 className="text-center mb-6 text-slate-200">Вход в систему</TypographyH2>
      <Formik
        initialValues={{ email: '', password: '' }}
        validationSchema={Yup.object({
          email: Yup.string().email('Пожалуйста, введите корректный email').required('Введите email'),
          password: Yup.string().required('Введите пароль'),
        })}
        onSubmit={handleSubmit}
      >
        <FormikForm autoComplete="off">
          <FormField
            name="email"
            label="Email"
            type="email"
            required
          />

          <FormField
            name="password"
            label="Пароль"
            type="password"
            required
          />

          <div>
            <button
              type="submit"
              className="w-full px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
            >
              Войти
            </button>
          </div>

          <div className="w-full space-y-2">
            <a
              className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 no-underline"
              href={process.env.NEXT_PUBLIC_TELEGRAM_OAUTH_URL || '#'}
            >
              <img src="/icons/telegram.svg" alt="Telegram" className="w-5 h-5" />
              Войти через Telegram
            </a>
            <div className="flex justify-between mt-3 text-slate-400">
              <a href="/reset-password" className="hover:text-slate-200">Забыли пароль?</a>
              <a href="/register" className="hover:text-slate-200">Нет аккаунта? Зарегистрироваться</a>
            </div>
          </div>
        </FormikForm>
      </Formik>

      <style jsx>{``}</style>
    </div>
  );
};