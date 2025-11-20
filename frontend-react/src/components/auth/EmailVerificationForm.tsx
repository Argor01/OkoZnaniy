import React, { useState, useEffect } from 'react';
import axios from 'axios';

interface EmailVerificationFormProps {
  email: string;
  onSuccess: (user: any, tokens: { access: string; refresh: string }) => void;
  onError?: (error: string) => void;
}

const EmailVerificationForm: React.FC<EmailVerificationFormProps> = ({
  email,
  onSuccess,
  onError,
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [message, setMessage] = useState('');

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Таймер для повторной отправки
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Автофокус на первое поле
  useEffect(() => {
    const firstInput = document.getElementById('code-0');
    if (firstInput) {
      (firstInput as HTMLInputElement).focus();
    }
  }, []);

  const handleChange = (index: number, value: string) => {
    // Разрешаем только цифры
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);
    setError('');

    // Автоматический переход к следующему полю
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      if (nextInput) {
        (nextInput as HTMLInputElement).focus();
      }
    }

    // Автоматическая отправка при заполнении всех полей
    if (newCode.every(digit => digit !== '') && index === 5) {
      handleSubmit(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    // Backspace - переход к предыдущему полю
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    
    // Проверяем, что вставлено 6 цифр
    if (/^\d{6}$/.test(pastedData)) {
      const newCode = pastedData.split('');
      setCode(newCode);
      
      // Фокус на последнее поле
      const lastInput = document.getElementById('code-5');
      if (lastInput) {
        (lastInput as HTMLInputElement).focus();
      }
      
      // Автоматическая отправка
      handleSubmit(pastedData);
    }
  };

  const handleSubmit = async (codeString?: string) => {
    const verificationCode = codeString || code.join('');
    
    if (verificationCode.length !== 6) {
      setError('Введите 6-значный код');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(`${API_URL}/api/users/verify_email_code/`, {
        email,
        code: verificationCode,
      });

      const { access, refresh, user } = response.data;
      
      // Сохраняем токены
      localStorage.setItem('access_token', access);
      localStorage.setItem('refresh_token', refresh);
      localStorage.setItem('user', JSON.stringify(user));

      setMessage('Email успешно подтвержден!');
      
      // Вызываем callback
      onSuccess(user, { access, refresh });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Ошибка подтверждения кода';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
      
      // Очищаем код при ошибке
      setCode(['', '', '', '', '', '']);
      const firstInput = document.getElementById('code-0');
      if (firstInput) {
        (firstInput as HTMLInputElement).focus();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    setLoading(true);
    setError('');
    setMessage('');

    try {
      await axios.post(`${API_URL}/api/users/resend_verification_code/`, {
        email,
      });

      setMessage('Код отправлен повторно');
      setResendCooldown(60); // 60 секунд до следующей отправки
      
      // Очищаем поля
      setCode(['', '', '', '', '', '']);
      const firstInput = document.getElementById('code-0');
      if (firstInput) {
        (firstInput as HTMLInputElement).focus();
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Ошибка отправки кода';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="email-verification-form">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Подтверждение email
        </h2>
        <p className="text-gray-600">
          Мы отправили код на <strong>{email}</strong>
        </p>
      </div>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
          Введите 6-значный код
        </label>
        <div className="flex justify-center gap-2">
          {code.map((digit, index) => (
            <input
              key={index}
              id={`code-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={index === 0 ? handlePaste : undefined}
              disabled={loading}
              className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all disabled:bg-gray-100"
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600 text-center">{error}</p>
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-sm text-green-600 text-center">{message}</p>
        </div>
      )}

      <div className="text-center">
        <button
          onClick={handleResend}
          disabled={loading || resendCooldown > 0}
          className="text-sm text-indigo-600 hover:text-indigo-500 disabled:text-gray-400 disabled:cursor-not-allowed"
        >
          {resendCooldown > 0
            ? `Отправить повторно через ${resendCooldown}с`
            : 'Отправить код повторно'}
        </button>
      </div>

      {loading && (
        <div className="mt-4 text-center">
          <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </div>
  );
};

export default EmailVerificationForm;
