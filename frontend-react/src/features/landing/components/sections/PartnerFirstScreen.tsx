import React from 'react';
import { useNavigate } from 'react-router-dom';

const PartnerFirstScreen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className="first-screen partner-first-screen">
      <div className="mcontainer">
        <div className="first-screen__wrapper">
          <div className="first-screen__content">
            <h1 className="first-screen__content-title">
              Бизнес с Око Знаний — это просто!
            </h1>
            <div className="first-screen__content-descripton">
              Станьте партнером и развивайте свой бизнес вместе с нами
            </div>
            <div className="first-screen__content-buttons">
              <button
                className="first-screen__content-buttons-task button"
                onClick={() => navigate('/become-partner#feedback')}
              >
                Стать партнёром
              </button>
            </div>
            <div className="partner-first-screen__stats">
              <div className="partner-first-screen__stat">
                <span className="partner-first-screen__stat-value">25%</span>
                <span className="partner-first-screen__stat-label">от каждого заказа</span>
              </div>
              <div className="partner-first-screen__stat">
                <span className="partner-first-screen__stat-value">1 млн ₽</span>
                <span className="partner-first-screen__stat-label">оборот за 2 месяца</span>
              </div>
              <div className="partner-first-screen__stat">
                <span className="partner-first-screen__stat-value">7 дней</span>
                <span className="partner-first-screen__stat-label">до первой прибыли</span>
              </div>
            </div>
          </div>

          <figure className="first-screen__figure">
            <img
              className="first-screen__figure-image"
              src="/assets/first-screen/first-screen-part.png"
              alt="partner"
              width={416}
              height={540}
            />
          </figure>
        </div>
      </div>
    </section>
  );
};

export default PartnerFirstScreen;
