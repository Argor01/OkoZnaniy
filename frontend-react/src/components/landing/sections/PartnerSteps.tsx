import React from 'react';

const PartnerSteps: React.FC = () => {
  return (
    <section className="advantages">
      <div className="mcontainer">
        <div style={{ 
          textAlign: 'center', 
          marginBottom: '40px',
          padding: '30px',
          backgroundColor: '#fff3e0',
          borderRadius: '12px',
          border: '2px solid #ff9800'
        }}>
          <h2 style={{ 
            fontSize: '36px', 
            color: '#e65100', 
            marginBottom: '16px',
            fontFamily: 'var(--font-family-display)',
            fontWeight: 800
          }}>
            Гарантируем <span style={{ whiteSpace: 'nowrap' }}>1 000 000 ₽</span> оборот вашего агентства через 2 месяца!
          </h2>
          <p style={{ fontSize: '18px', marginBottom: '8px', color: '#333' }}>
            ✅ Персональная поддержка от директора биржи на протяжении 1 месяца
          </p>
          <p style={{ fontSize: '18px', marginBottom: '0', color: '#333' }}>
            ✅ Далее персональный менеджер навсегда
          </p>
        </div>

        <h2 style={{ 
          textAlign: 'center', 
          fontSize: '48px', 
          color: '#238ce2', 
          marginBottom: '40px',
          fontFamily: 'var(--font-family-display)',
          fontWeight: 800
        }}>
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
