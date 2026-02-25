import React from 'react';

const PriceCard: React.FC<{ title: string; term: string; price: string }> = ({ title, term, price }) => (
  <div className="prices__main-card">
    <div className="prices__main-card-wrapper">
      <div className="prices__main-card-details">
        <div className="prices__main-card-details-title">{title}</div>
        <div className="prices__main-card-details-info">
          <div className="prices__main-card-details-info-item">
            <span className="prices__main-card-details-info-item-title">Срок:</span>
            <strong className="prices__main-card-details-info-item-value">{term}</strong>
          </div>
          <div className="prices__main-card-details-info-item">
            <span className="prices__main-card-details-info-item-title">Цена:</span>
            <strong className="prices__main-card-details-info-item-value">{price}</strong>
          </div>
        </div>
      </div>
      <div className="prices__main-card-more">
        <button className="prices__main-card-more-button button">Узнать стоимость</button>
      </div>
    </div>
  </div>
);

const Prices: React.FC = () => (
  <section className="prices">
    <div className="mcontainer">
      <div className="prices__wrapper">
        <div className="prices__details">
          <h2 className="prices__details-title">Доступные цены - отличные результаты!</h2>
          <div className="prices__details-description">Ваши задачи выполняют только проверенные эксперты без посредников ☝</div>
        </div>

        <div className="prices__main">
          <div className="prices__main-visible">
            <PriceCard title="Дипломная работа" term="от 3 дней" price="от 5000 ₽" />
            <PriceCard title="Курсовая работа" term="от 1 дней" price="от 1000 ₽" />
            <PriceCard title="Контрольная работа" term="от 3 дней" price="от 500 ₽" />
            <PriceCard title="Отчет по практике" term="от 1 дней" price="от 1000 ₽" />
            <PriceCard title="Реферат" term="от 3 дней" price="от 500 ₽" />
          </div>
        </div>
      </div>
    </div>
  </section>
);

export default Prices;



