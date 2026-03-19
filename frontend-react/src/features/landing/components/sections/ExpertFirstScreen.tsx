import React from 'react';
import { useNavigate } from 'react-router-dom';

const ExpertFirstScreen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="first-screen expert-first-screen">
      <div className="mcontainer">
        <div className="first-screen__wrapper">
          <div className="first-screen__content">
            <h1 className="first-screen__content-title">
              Стань автором студенческих работ
            </h1>
            <div className="first-screen__content-descripton">
              и зарабатывай от 100 000 ₽ в месяц
            </div>
            <div className="first-screen__content-buttons">
              <button
                className="first-screen__content-buttons-task button"
                onClick={() => navigate('/expert-application')}
              >
                Стать экспертом
              </button>
            </div>
            <div className="expert-first-screen__stats">
              <div className="expert-first-screen__stat">
                <span className="expert-first-screen__stat-value">5 000+</span>
                <span className="expert-first-screen__stat-label">активных заказов</span>
              </div>
              <div className="expert-first-screen__stat">
                <span className="expert-first-screen__stat-value">от 500 ₽</span>
                <span className="expert-first-screen__stat-label">за одну работу</span>
              </div>
              <div className="expert-first-screen__stat">
                <span className="expert-first-screen__stat-value">24/7</span>
                <span className="expert-first-screen__stat-label">поддержка</span>
              </div>
            </div>
          </div>

          <figure className="first-screen__figure">
            <img
              className="first-screen__figure-image"
              src="/assets/first-screen/first-screen-expert.png"
              alt="expert"
              width={811}
              height={879}
            />
          </figure>
        </div>
      </div>
    </section>
  );
};

export default ExpertFirstScreen;
