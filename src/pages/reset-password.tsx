import React, { useMemo, useState } from 'react';
import { Formik, Form as FormikForm } from 'formik';
import * as Yup from 'yup';
import { TypographyH2 } from '@/components/shared/Typography';
import { FormField } from '@/components/shared/Form/FormField';
import { useApi } from '@/hooks/useApi';

type Method = 'email' | 'phone';

interface ResetPayload {
  contact: string; // email or phone
  code: string;
  newPassword: string;
}

const ResetPasswordPage: React.FC = () => {
  const api = useApi();
  const [method, setMethod] = useState<Method>('email');
  const [sending, setSending] = useState(false);
  const [sendStatus, setSendStatus] = useState<string | null>(null);

  const validationSchema = useMemo(() => (
    Yup.object({
      contact:
        method === 'email'
          ? Yup.string().email('Введите корректный email').required('Введите email')
          : Yup.string()
              .matches(/^\+?\d{10,14}$/i, 'Введите корректный номер телефона')
              .required('Введите телефон'),
      code: Yup.string().required('Введите код'),
      newPassword: Yup.string().min(6, 'Минимум 6 символов').required('Введите новый пароль'),
    })
  ), [method]);

  const handleSubmit = async (values: ResetPayload) => {
    try {
      await api.post('/api/auth/reset/confirm/', { ...values, method });
      setSendStatus('Пароль успешно обновлен');
    } catch (e) {
      // handled in useApi
    }
  };


  return (
    <div className="reset-page">
      <TypographyH2 className="text-center text-slate-200">Восстановление пароля</TypographyH2>
      <div className="card">
        <Formik
          initialValues={{ contact: '', code: '', newPassword: '' }}
          validationSchema={validationSchema}
          onSubmit={handleSubmit}
        >
          {({ values, setFieldError, setFieldTouched }) => (
            <FormikForm autoComplete="off">
              <div className="mb-3">
                <label className="block text-sm font-medium text-slate-300 mb-1">Способ получения кода</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setMethod('email')}
                    className={`px-3 py-2 rounded-lg border ${method === 'email' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-900 text-slate-200 border-slate-700'}`}
                  >
                    Почта
                  </button>
                  <button
                    type="button"
                    onClick={() => setMethod('phone')}
                    className={`px-3 py-2 rounded-lg border ${method === 'phone' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-slate-900 text-slate-200 border-slate-700'}`}
                  >
                    Телефон
                  </button>
                </div>
              </div>

              <FormField
                name="contact"
                label={method === 'email' ? 'Email' : 'Номер телефона'}
                type={method === 'email' ? 'email' : 'text'}
                required
              />

              <div className="mb-3">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      setSending(true);
                      setSendStatus(null);
                      if (!values.contact) {
                        setFieldTouched('contact', true);
                        setFieldError('contact', method === 'email' ? 'Введите email' : 'Введите телефон');
                        return;
                      }
                      const payload = method === 'email' ? { email: values.contact } : { phone: values.contact };
                      await api.post('/api/auth/reset/send-code/', payload);
                      setSendStatus('Код для восстановления отправлен');
                    } catch (e) {
                      // handled in useApi
                    } finally {
                      setSending(false);
                    }
                  }}
                  disabled={sending}
                  className="w-full px-3 py-2 rounded-lg border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  Отправить код
                </button>
                {sendStatus && (
                  <p className="mt-1 text-sm text-green-500">{sendStatus}</p>
                )}
              </div>

              <FormField name="code" label="Код из письма/смс" required />
              <FormField name="newPassword" label="Новый пароль" type="password" required />

              <div>
                <button
                  type="submit"
                  className="w-full px-3 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  Обновить пароль
                </button>
              </div>
            </FormikForm>
          )}
        </Formik>
      </div>

      <style jsx>{`
        .reset-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 24px;
          background: radial-gradient(1200px 500px at 30% 20%, rgba(67,56,202,0.6), transparent),
            radial-gradient(1200px 500px at 70% 80%, rgba(236,72,153,0.5), transparent),
            linear-gradient(135deg, #0f172a, #1f2937);
          position: relative;
        }
        .reset-page::before {
          content: '';
          position: absolute;
          inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.08) 1px, transparent 1px);
          background-size: 40px 40px;
          pointer-events: none;
        }
        .card {
          width: 100%;
          max-width: 420px;
          margin-top: 12px;
          padding: 24px;
          border-radius: 16px;
          background: rgba(16, 18, 27, 0.9);
          box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
          color: #fff;
          backdrop-filter: blur(6px);
        }
        /* Убраны стили под AntD; остались общие стили страницы */
      `}</style>
    </div>
  );
};

export default ResetPasswordPage;