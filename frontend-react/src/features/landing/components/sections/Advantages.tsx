import React from 'react';


const Advantages: React.FC = () => (
  <section className="advantages" id="experts">
    <div className="mcontainer">
      <div className="advantages__wrapper">
        <div className="advantages__card">
          <figure className="advantages__card-icon">
            <img className="advantages__card-icon-image" src="/assets/advantages/advantages-icon-1.svg" alt="icon" width={61} height={61} />
          </figure>
          <div className="advantages__card-title">Более 800 тысяч довольных студентов</div>
          <div className="advantages__card-text">
            У нас уже 847 618 оценок, и средний рейтинг — впечатляющие 4,9 из 5!
          </div>
        </div>

        <div className="advantages__card">
          <figure className="advantages__card-icon">
            <img className="advantages__card-icon-image" src="/assets/advantages/advantages-icon-2.svg" alt="icon" width={61} height={61} />
          </figure>
          <div className="advantages__card-title">Мгновенный отклик экспертов</div>
          <div className="advantages__card-text">
            В нашей команде — свыше 15 000 проверенных специалистов... готовность от 1 часа!
          </div>
        </div>

        <div className="advantages__card">
          <figure className="advantages__card-icon">
            <img className="advantages__card-icon-image" src="/assets/advantages/advantages-icon-3.svg" alt="icon" width={61} height={61} />
          </figure>
          <div className="advantages__card-title">Выгодные цены без посредников</div>
          <div className="advantages__card-text">
            Общение напрямую с экспертами позволяет вам экономить: наши цены в 2-3 раза ниже.
          </div>
        </div>

        <div className="advantages__card">
          <figure className="advantages__card-icon">
            <img className="advantages__card-icon-image" src="/assets/advantages/advantages-icon-4.svg" alt="icon" width={61} height={61} />
          </figure>
          <div className="advantages__card-title">Бесплатные доработки и сопровождение</div>
          <div className="advantages__card-text">
            Внесём изменения и предоставим консультации по вашему заказу бесплатно.
          </div>
        </div>

        <div className="advantages__card">
          <figure className="advantages__card-icon">
            <img className="advantages__card-icon-image" src="/assets/advantages/advantages-icon-5.svg" alt="icon" width={61} height={61} />
          </figure>
          <div className="advantages__card-title">Возврат денег — гарантия безопасности</div>
          <div className="advantages__card-text">Вернём деньги полностью, если автор не выполнит работу.</div>
        </div>
      </div>
    </div>
  </section>
);

export default Advantages;



