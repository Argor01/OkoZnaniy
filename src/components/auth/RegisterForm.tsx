import React, { useState } from 'react';
import { Formik, Form as FormikForm } from 'formik';
import * as Yup from 'yup';
import { TypographyH2 } from '@/components/shared/Typography';
import { FormField } from '@/components/shared/Form/FormField';
import { useApi } from '@/hooks/useApi';
import { useDispatch } from 'react-redux';
import { setCredentials } from '@/store/slices/authSlice';
import { useRouter } from 'next/router';

 

type VerificationMethod = 'email' | 'phone';

interface RegisterFormData {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  verificationCode?: string;
}

interface RegisterResponse {
  user: {
    id: number;
    email: string;
    firstName: string;
    lastName: string;
    role: 'client' | 'expert';
  };
  token: string;
}

export const RegisterForm: React.FC = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const api = useApi();
  const [method, setMethod] = useState<VerificationMethod>('email');
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  const telegramOAuthUrl = process.env.NEXT_PUBLIC_TELEGRAM_OAUTH_URL || '#';

  const handleSubmit = async (values: RegisterFormData) => {
    try {
      const response = await api.post<RegisterResponse>('/api/auth/register/', {
        ...values,
        method,
      });
      dispatch(setCredentials(response));
      router.push('/orders');
    } catch (error) {
      // Ошибка уже обработана в useApi
      console.error('Register error:', error);
    }
  };

  return (
    <div className="auth-card w-full max-w-[420px] mx-auto p-6 rounded-2xl bg-slate-900/90 shadow-auth text-white backdrop-blur">
      <TypographyH2 className="text-center text-white mb-6">Регистрация</TypographyH2>
      <Formik
        initialValues={{ firstName: '', lastName: '', phone: '', email: '', verificationCode: '' }}
        validationSchema={Yup.object({
          firstName: Yup.string().required('Введите имя'),
          lastName: Yup.string().required('Введите фамилию'),
          phone: Yup.string()
            .matches(/^\+?\d{10,14}$/i, 'Введите корректный номер телефона')
            .nullable().optional(),
          email: Yup.string().email('Введите корректный email').required('Введите email'),
          verificationCode: Yup.string().required('Введите код подтверждения'),
        })}
        onSubmit={handleSubmit}
      >
        {({ values, setFieldError, setFieldTouched }) => (
          <FormikForm autoComplete="off">
            <FormField name="firstName" label="Имя" required />
            <FormField name="lastName" label="Фамилия" required />
            <FormField
              name="phone"
              label="Номер телефона"
              placeholder="Напр. +79991234567"
            />
            <FormField
              name="email"
              label="Email"
              type="email"
              required
            />

            <div className="w-full space-y-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    setSending(true);
                    setSendStatus(null);
                    const payload = method === 'email' ? { email: values.email } : { phone: values.phone };
                    if (method === 'email' && !values.email) {
                      setFieldTouched('email', true);
                      setFieldError('email', 'Введите email');
                      return;
                    }
                    if (method === 'phone' && !values.phone) {
                      setFieldTouched('phone', true);
                      setFieldError('phone', 'Введите телефон');
                      return;
                    }
                    await api.post('/api/auth/send-code/', payload);
                    setCodeSent(true);
                    setSendStatus('Код отправлен');
                  } catch (error) {
                    // Ошибка уже обработана в useApi
                  } finally {
                    setSending(false);
                  }
                }}
                disabled={sending}
                className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 disabled:opacity-50"
              >
                Получить код
              </button>
              {sendStatus && (
                <p className="text-sm text-green-500">{sendStatus}</p>
              )}
              <FormField name="verificationCode" label="Код подтверждения" required />
            </div>

            <div className="mt-4">
              <button
                type="submit"
                className="w-full px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
              >
                Зарегистрироваться
              </button>
            </div>

            <div className="mt-2">
              <a
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 no-underline"
                href={telegramOAuthUrl}
              >
                <img src="/icons/telegram.svg" alt="Telegram" className="w-5 h-5" />
                Войти через Telegram
              </a>
              <div className="flex justify-between mt-3 text-slate-400">
                <a href="/login" className="hover:text-slate-200">Уже есть аккаунт? Войти</a>
                <a href="/reset-password" className="hover:text-slate-200">Забыли пароль?</a>
              </div>
            </div>
          </FormikForm>
        )}
      </Formik>
      <style jsx>{``}</style>
    </div>
  );
};