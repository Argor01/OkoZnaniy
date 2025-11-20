import React from 'react';
import { DollarOutlined, ThunderboltOutlined, CustomerServiceOutlined, GlobalOutlined } from '@ant-design/icons';

const PartnerBenefits: React.FC = () => {
  return (
    <section className="place-task partner-benefits">
      <div className="mcontainer">
        <div className="place-task__content">
          <h2 className="place-task__content-title">Преимущества партнерства</h2>
          <p className="place-task__content-description">
            Получайте стабильный доход и развивайте свой бизнес с нашей поддержкой
          </p>
        </div>

        <div className="place-task__advantages partner-benefits__grid">
          <div className="place-task__advantages-card">
            <figure className="place-task__advantages-card-figure">
              <DollarOutlined className="place-task__advantages-card-icon" />
            </figure>
            <div className="place-task__advantages-card-text">Получай 25% от заказа на протяжении полугода</div>
          </div>

          <div className="place-task__advantages-card">
            <figure className="place-task__advantages-card-figure">
              <ThunderboltOutlined className="place-task__advantages-card-icon" />
            </figure>
            <div className="place-task__advantages-card-text">Получение прибыли уже через неделю</div>
          </div>

          <div className="place-task__advantages-card">
            <figure className="place-task__advantages-card-figure">
              <CustomerServiceOutlined className="place-task__advantages-card-icon" />
            </figure>
            <div className="place-task__advantages-card-text">Персональная поддержка от директора биржи</div>
          </div>

          <div className="place-task__advantages-card">
            <figure className="place-task__advantages-card-figure">
              <GlobalOutlined className="place-task__advantages-card-icon" />
            </figure>
            <div className="place-task__advantages-card-text">Работа онлайн без офиса</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerBenefits;
