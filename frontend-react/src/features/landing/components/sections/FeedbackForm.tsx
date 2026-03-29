import React, { useState } from 'react';
import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';
import './FeedbackForm.css';

interface FeedbackFormProps {
  buttonText: string;
  type?: 'registration' | 'partner'; // Тип формы
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ buttonText, type = 'registration' }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Введите email');
      return;
    }

    setLoading(true);
    setError('');
    setMessage('');

    try {
      // Выбираем endpoint в зависимости от типа формы
      const endpoint = type === 'partner' 
        ? API_ENDPOINTS.notifications.sendPartnerEmail
        : API_ENDPOINTS.notifications.sendRegistrationEmail;
      
      const response = await apiClient.post(endpoint, {
        email,
      });

      if (response.status === 200) {
        setMessage('Инструкция отправлена! Проверьте ваш email');
        setEmail('');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.error || 'Ошибка соединения. Попробуйте позже';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="feedback-form-section">
      <div className="mcontainer">
        <form className="feedback-form-inner" onSubmit={handleSubmit}>
          <div className="feedback-form-text-block">
            <h2 className="feedback-form-title">Готов начать зарабатывать?</h2>
            <p className="feedback-form-desc">Оставь email — мы пришлём инструкцию по регистрации и первые доступные заказы</p>
          </div>
          <div className="feedback-form-wrapper">
            <input
              type="email"
              placeholder="Ваш E-mail"
              className="feedback-form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className="feedback-form-button button"
              disabled={loading}
            >
              {loading ? 'Отправка...' : buttonText}
            </button>
          </div>
          {message && <p className="feedback-form-success">{message}</p>}
          {error && <p className="feedback-form-error">{error}</p>}
          <p className="feedback-form-legal">
            Нажимая «{buttonText}», вы принимаете условия{' '}
            <a href="#">Пользовательского соглашения</a> и{' '}
            <a href="#">Политики конфиденциальности</a>
          </p>
        </form>
      </div>
    </section>
  );
};

export default FeedbackForm;
