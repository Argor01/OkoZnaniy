import React from 'react';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './Advantages.module.css';


const Advantages: React.FC = () => (
  <section className={styles.advantages} id="experts">
    <div className={landingStyles.mcontainer}>
      <div className={styles.advantagesWrapper}>
        <div className={styles.advantagesCard}>
          <figure className={styles.advantagesCardIcon}>
            <img className={styles.advantagesCardIconImage} src="/assets/advantages/advantages-icon-1.svg" alt="icon" width={61} height={61} />
          </figure>
          <div className={styles.advantagesCardTitle}>Более 800 тысяч довольных студентов</div>
          <div className={styles.advantagesCardText}>
            У нас уже 847 618 оценок, и средний рейтинг — впечатляющие 4,9 из 5!
          </div>
        </div>

        <div className={styles.advantagesCard}>
          <figure className={styles.advantagesCardIcon}>
            <img className={styles.advantagesCardIconImage} src="/assets/advantages/advantages-icon-2.svg" alt="icon" width={61} height={61} />
          </figure>
          <div className={styles.advantagesCardTitle}>Мгновенный отклик экспертов</div>
          <div className={styles.advantagesCardText}>
            В нашей команде — свыше 15 000 проверенных специалистов... готовность от 1 часа!
          </div>
        </div>

        <div className={styles.advantagesCard}>
          <figure className={styles.advantagesCardIcon}>
            <img className={styles.advantagesCardIconImage} src="/assets/advantages/advantages-icon-3.svg" alt="icon" width={61} height={61} />
          </figure>
          <div className={styles.advantagesCardTitle}>Выгодные цены без посредников</div>
          <div className={styles.advantagesCardText}>
            Общение напрямую с экспертами позволяет вам экономить: наши цены в 2-3 раза ниже.
          </div>
        </div>

        <div className={styles.advantagesCard}>
          <figure className={styles.advantagesCardIcon}>
            <img className={styles.advantagesCardIconImage} src="/assets/advantages/advantages-icon-4.svg" alt="icon" width={61} height={61} />
          </figure>
          <div className={styles.advantagesCardTitle}>Бесплатные доработки и сопровождение</div>
          <div className={styles.advantagesCardText}>
            Внесём изменения и предоставим консультации по вашему заказу бесплатно.
          </div>
        </div>

        <div className={styles.advantagesCard}>
          <figure className={styles.advantagesCardIcon}>
            <img className={styles.advantagesCardIconImage} src="/assets/advantages/advantages-icon-5.svg" alt="icon" width={61} height={61} />
          </figure>
          <div className={styles.advantagesCardTitle}>Возврат денег — гарантия безопасности</div>
          <div className={styles.advantagesCardText}>Вернём деньги полностью, если автор не выполнит работу.</div>
        </div>
      </div>
    </div>
  </section>
);

export default Advantages;



