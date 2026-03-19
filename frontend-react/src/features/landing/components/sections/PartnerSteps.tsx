import React from 'react';

const steps = [
  {
    num: '01',
    title: 'Общение с менеджером',
    text: 'Связываемся с вами и обсуждаем все детали сотрудничества',
  },
  {
    num: '02',
    title: 'Заполнение договора',
    text: 'Оформляем все необходимые документы для начала работы',
  },
  {
    num: '03',
    title: 'Составление плана запуска',
    text: 'Разрабатываем индивидуальную стратегию развития вашего бизнеса',
  },
  {
    num: '04',
    title: 'Открытие точки',
    text: 'Онлайн без офиса — работайте откуда удобно',
  },
  {
    num: '05',
    title: 'Получай 25% от заказа',
    text: 'На протяжении полугода получайте стабильный доход от каждого заказа',
  },
  {
    num: '06',
    title: 'Первая прибыль через неделю',
    text: 'Начинайте зарабатывать практически сразу после запуска',
  },
];

const PartnerSteps: React.FC = () => {
  return (
    <section className="partner-steps-section">
      <div className="mcontainer">
        <div className="partner-steps-section__promo">
          <div className="partner-steps-section__promo-badge">Гарантия</div>
          <h2 className="partner-steps-section__promo-title">
            1 000 000 ₽ оборот вашего агентства через 2 месяца
          </h2>
          <div className="partner-steps-section__promo-items">
            <div className="partner-steps-section__promo-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Персональная поддержка от директора биржи на протяжении 1 месяца
            </div>
            <div className="partner-steps-section__promo-item">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Далее персональный менеджер навсегда
            </div>
          </div>
        </div>

        <h2 className="partner-steps-section__heading">Как проходит работа</h2>

        <div className="partner-steps-section__grid">
          {steps.map((step) => (
            <div className="partner-steps-section__card" key={step.num}>
              <div className="partner-steps-section__card-num">{step.num}</div>
              <div className="partner-steps-section__card-title">{step.title}</div>
              <div className="partner-steps-section__card-text">{step.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnerSteps;
