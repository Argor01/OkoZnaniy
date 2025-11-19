import React from 'react';
import '../../../styles/feedback-form.css';

interface FeedbackFormProps {
  buttonText: string;
}

const FeedbackForm: React.FC<FeedbackFormProps> = ({ buttonText }) => {
  return (
    <section className="feedback-form-section">
        <div className="feedback-form-wrapper">
          <input type="email" placeholder="Ваш E-mail" className="feedback-form-input" />
          <div className="feedback-form-bottom">
            <p className="feedback-form-text">
              Оставляя свои контактные данные и нажимая «{buttonText}», я соглашаюсь пройти процедуру регистрации на Платформе, принимаю условия <a href="#">Пользовательского соглашения</a> и <a href="#">Политики конфиденциальности</a> в целях заключения соглашения.
            </p>
            <button type="submit" className="feedback-form-button">{buttonText}</button>
          </div>
        </div>
    </section>
  );
};

export default FeedbackForm;