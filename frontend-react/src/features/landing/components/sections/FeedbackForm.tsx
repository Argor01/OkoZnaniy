import React, { useState } from 'react';
import './FeedbackForm.css';

interface FeedbackFormProps {
  buttonText: string;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ buttonText }) => {
  const [email, setEmail] = useState('');

  return (
    <section className="feedback-form-section">
      <div className="mcontainer">
        <div className="feedback-form-inner">
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
            />
            <button type="submit" className="feedback-form-button button">{buttonText}</button>
          </div>
          <p className="feedback-form-legal">
            Нажимая «{buttonText}», вы принимаете условия{' '}
            <a href="#">Пользовательского соглашения</a> и{' '}
            <a href="#">Политики конфиденциальности</a>
          </p>
        </div>
      </div>
    </section>
  );
};

export default FeedbackForm;
