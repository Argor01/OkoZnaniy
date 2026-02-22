import React from 'react';

const PartnerSteps: React.FC = () => {
  return (
    <section className="advantages">
      <div className="mcontainer">
        <div className="partner-steps__promo">
          <h2 className="partner-steps__promo-title">
            Гарантируем <span className="partner-steps__promo-highlight">1 000 000 ₽</span> оборот вашего агентства через 2 месяца!
          </h2>
          <p className="partner-steps__promo-text">
            ✅ Персональная поддержка от директора биржи на протяжении 1 месяца
          </p>
          <p className="partner-steps__promo-text">
            ✅ Далее персональный менеджер навсегда
          </p>
        </div>

        <h2 className="partner-steps__heading">
          Как проходит работа
        </h2>
        
        <div className="advantages__wrapper">
          <div className="advantages__card">
            <figure className="advantages__card-icon">
              <img
                className="advantages__card-icon-image"
                src="/assets/advantages/advantages-icon-1.svg"
                alt="icon"
                width={61}
                height={61}
              />
            </figure>
            <h3 className="advantages__card-title">1. Общение с менеджером по телефону</h3>
            <p className="advantages__card-text">
              Связываемся с вами и обсуждаем все детали сотрудничества
            </p>
          </div>

          <div className="advantages__card">
            <figure className="advantages__card-icon">
              <img
                className="advantages__card-icon-image"
                src="/assets/advantages/advantages-icon-2.svg"
                alt="icon"
                width={61}
                height={61}
              />
            </figure>
            <h3 className="advantages__card-title">2. Заполнение договора</h3>
            <p className="advantages__card-text">
              Оформляем все необходимые документы для начала работы
            </p>
          </div>

          <div className="advantages__card">
            <figure className="advantages__card-icon">
              <img
                className="advantages__card-icon-image"
                src="/assets/advantages/advantages-icon-3.svg"
                alt="icon"
                width={61}
                height={61}
              />
            </figure>
            <h3 className="advantages__card-title">3. Составление плана запуска с менеджером</h3>
            <p className="advantages__card-text">
              Разрабатываем индивидуальную стратегию развития вашего бизнеса
            </p>
          </div>

          <div className="advantages__card">
            <figure className="advantages__card-icon">
              <img
                className="advantages__card-icon-image"
                src="/assets/advantages/advantages-icon-4.svg"
                alt="icon"
                width={61}
                height={61}
              />
            </figure>
            <h3 className="advantages__card-title">4. Открытие точки в своем городе</h3>
            <p className="advantages__card-text">
              Она может быть онлайн без офиса - работайте откуда удобно
            </p>
          </div>

          <div className="advantages__card">
            <figure className="advantages__card-icon">
              <img
                className="advantages__card-icon-image"
                src="/assets/advantages/advantages-icon-5.svg"
                alt="icon"
                width={61}
                height={61}
              />
            </figure>
            <h3 className="advantages__card-title">5. Получай 25% от заказа</h3>
            <p className="advantages__card-text">
              На протяжении полугода получайте стабильный доход от каждого заказа
            </p>
          </div>

          <div className="advantages__card">
            <figure className="advantages__card-icon">
              <i className="fi fi-ts-rocket-lunch advantages__card-icon-flaticon"></i>
            </figure>
            <h3 className="advantages__card-title">6. Получение прибыли уже через неделю</h3>
            <p className="advantages__card-text">
              Начинайте зарабатывать практически сразу после запуска
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PartnerSteps;
