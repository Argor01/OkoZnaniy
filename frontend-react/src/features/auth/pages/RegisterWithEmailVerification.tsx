import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import EmailVerificationForm from '../components/EmailVerificationForm';
import { apiClient } from '@/api/client';

const RegisterWithEmailVerification: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const debugEnabled =
    import.meta.env.DEV &&
    typeof window !== 'undefined' &&
    window.localStorage?.getItem('debug_api') === '1';
  const [step, setStep] = useState<'register' | 'verify'>('register');
  const [email, setEmail] = useState('');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    password2: '',
    role: 'client',
    referral_code: '',
  });
  const [agreement, setAgreement] = useState(false);
  const [newsletter, setNewsletter] = useState(false);
  const [userAgreement, setUserAgreement] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fromGoogle, setFromGoogle] = useState(false);

  // Проверка авторизации - если пользователь уже авторизован, редиректим на главную
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (token) {
      navigate('/dashboard');
    }
  }, [navigate]);
  
  // Обработка параметров URL
  useEffect(() => {
    const emailParam = searchParams.get('email');
    const fromParam = searchParams.get('from');
    const refParam = searchParams.get('ref');
    
    if (emailParam && fromParam === 'google') {
      setFormData(prev => ({
        ...prev,
        email: emailParam
      }));
      setFromGoogle(true);
    }
    
    // Если есть реферальный код в URL
    if (refParam) {
      setFormData(prev => ({
        ...prev,
        referral_code: refParam
      }));
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

    if (!agreement) {
      setError('Необходимо принять согласие на обработку персональных данных');
      return;
    }

    if (!userAgreement) {
      setError('Необходимо принять пользовательское соглашение');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const payload = {
        ...formData,
        newsletter_subscription: newsletter
      };
      const response = await apiClient.post('/users/', payload);
      
      
      if (response.data.email_verification_required) {
        
        setEmail(formData.email);
        setStep('verify');
      } else {
        
        navigate('/login');
      }
    } catch (err: unknown) {
      if (debugEnabled) console.error('Registration error:', err);
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
    
    navigate('/expert');
  };

  if (step === 'verify') {
    return (
      <div className="register-page">
        <div className="verification-container">
          <EmailVerificationForm
            email={email}
            onSuccess={handleVerificationSuccess}
            onError={(error) => {
              if (debugEnabled) console.error('Verification error:', error);
            }}
          />
          
          <div className="verification-back-button">
            <button
              onClick={() => setStep('register')}
              className="verification-back-button"
            >
              ← Вернуться к регистрации
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="register-page">
      <div className="register-container">
        <div className="register-header">
          <h2 className="register-title">
            Регистрация
          </h2>
          <p className="register-subtitle">
            {fromGoogle ? 'Завершите регистрацию с Google аккаунтом' : 'Создайте аккаунт на платформе OkoZnaniy'}
          </p>
          {fromGoogle && (
            <div className="register-info-box register-info-google">
              <p>
                ✓ Email из Google: <strong>{formData.email}</strong>
              </p>
              <p style={{ fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
                Создайте пароль для завершения регистрации
              </p>
            </div>
          )}
          {formData.referral_code && (
            <div className="register-info-box register-info-referral">
              <p>
                ✓ Реферальный код: <strong>{formData.referral_code}</strong>
              </p>
              <p style={{ fontSize: '12px', marginTop: '4px', marginBottom: 0 }}>
                Вы регистрируетесь по приглашению партнера
              </p>
            </div>
          )}
        </div>

        <form className="register-form" onSubmit={handleSubmit}>
          <div className="register-field">
            <label htmlFor="email" className="register-label">
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
              className="register-input"
              placeholder="your@email.com"
            />
          </div>

          <div className="register-field">
            <label htmlFor="password" className="register-label">
              Пароль
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="register-input"
              placeholder="Минимум 8 символов"
            />
          </div>

          <div className="register-field">
            <label htmlFor="password2" className="register-label">
              Подтвердите пароль
            </label>
            <input
              id="password2"
              name="password2"
              type="password"
              required
              value={formData.password2}
              onChange={handleChange}
              className="register-input"
              placeholder="Повторите пароль"
            />
          </div>

          <div className="register-field">
            <label htmlFor="role" className="register-label">
              Я хочу
            </label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              className="register-select"
            >
              <option value="client">Заказывать работы</option>
              <option value="expert">Выполнять работы</option>
              <option value="partner">Стать партнером</option>
            </select>
          </div>

          <div className="register-checkbox-group">
            <div className="register-checkbox-item">
              <input
                id="agreement"
                name="agreement"
                type="checkbox"
                required
                checked={agreement}
                onChange={(e) => setAgreement(e.target.checked)}
                className="register-checkbox"
              />
              <label htmlFor="agreement" className="register-checkbox-label">
                Я предоставляю своё согласие на <a href="/docs/personal_data_processing.pdf" target="_blank" rel="noopener noreferrer">обработку персональных данных</a> в соответствии с <a href="/docs/privacy_policy.pdf" target="_blank" rel="noopener noreferrer">Политикой обработки персональных данных</a>
              </label>
            </div>

            <div className="register-checkbox-item">
              <input
                id="userAgreement"
                name="userAgreement"
                type="checkbox"
                required
                checked={userAgreement}
                onChange={(e) => setUserAgreement(e.target.checked)}
                className="register-checkbox"
              />
              <label htmlFor="userAgreement" className="register-checkbox-label">
                Я принимаю <a href={formData.role === 'client' ? "/docs/user_agreement_client.pdf" : "/docs/user_agreement_expert.pdf"} target="_blank" rel="noopener noreferrer">пользовательское соглашение</a>
              </label>
            </div>

            <div className="register-checkbox-item">
              <input
                id="newsletter"
                name="newsletter"
                type="checkbox"
                checked={newsletter}
                onChange={(e) => setNewsletter(e.target.checked)}
                className="register-checkbox"
              />
              <label htmlFor="newsletter" className="register-checkbox-label">
                Я предоставляю своё <a href="/docs/advertising_consent.pdf" target="_blank" rel="noopener noreferrer">согласие на получение новостной и рекламной рассылки</a>
              </label>
            </div>
          </div>

          {error && (
            <div className="register-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="register-button"
          >
            {loading ? 'Регистрация...' : 'Зарегистрироваться'}
          </button>

          <div className="register-footer">
            <a href="/login">
              Уже есть аккаунт? Войти
            </a>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RegisterWithEmailVerification;
