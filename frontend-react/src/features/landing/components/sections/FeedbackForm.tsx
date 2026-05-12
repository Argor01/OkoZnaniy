import React, { useState } from 'react';
import apiClient from '@/api/client';
import { API_ENDPOINTS } from '@/config/endpoints';
import styles from './FeedbackForm.module.css';
import landingStyles from '@/features/landing/Landing.module.css';

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
    <section className={styles.feedbackFormSection}>
      <div className={landingStyles.mcontainer}>
        <form className={styles.feedbackFormInner} onSubmit={handleSubmit}>
          <div className={styles.feedbackFormTextBlock}>
            <h2 className={styles.feedbackFormTitle}>Готов начать зарабатывать?</h2>
            <p className={styles.feedbackFormDesc}>Оставь email — мы пришлём инструкцию по регистрации и первые доступные заказы</p>
          </div>
          <div className={styles.feedbackFormWrapper}>
            <input
              type="email"
              placeholder="Ваш E-mail"
              className={styles.feedbackFormInput}
              value={email}
              onChange={e => setEmail(e.target.value)}
              disabled={loading}
            />
            <button 
              type="submit" 
              className={`${styles.feedbackFormButton} ${landingStyles.button}`}
              disabled={loading}
            >
              {loading ? 'Отправка...' : buttonText}
            </button>
          </div>
          {message && <p className={styles.feedbackFormSuccess}>{message}</p>}
          {error && <p className={styles.feedbackFormError}>{error}</p>}
          <p className={styles.feedbackFormLegal}>
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
