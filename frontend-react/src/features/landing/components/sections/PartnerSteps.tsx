import React from 'react';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './PartnerSteps.module.css';

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
    <section className={styles.partnerStepsSection}>
      <div className={landingStyles.mcontainer}>
        <div className={styles.partnerStepsSectionPromo}>
          <div className={styles.partnerStepsSectionPromoBadge}>Гарантия</div>
          <h2 className={styles.partnerStepsSectionPromoTitle}>
            1 000 000 ₽ оборот вашего агентства через 2 месяца
          </h2>
          <div className={styles.partnerStepsSectionPromoItems}>
            <div className={styles.partnerStepsSectionPromoItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Персональная поддержка от директора биржи на протяжении 1 месяца
            </div>
            <div className={styles.partnerStepsSectionPromoItem}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Далее персональный менеджер навсегда
            </div>
          </div>
        </div>

        <h2 className={styles.partnerStepsSectionHeading}>Как проходит работа</h2>

        <div className={styles.partnerStepsSectionGrid}>
          {steps.map((step) => (
            <div className={styles.partnerStepsSectionCard} key={step.num}>
              <div className={styles.partnerStepsSectionCardNum}>{step.num}</div>
              <div className={styles.partnerStepsSectionCardTitle}>{step.title}</div>
              <div className={styles.partnerStepsSectionCardText}>{step.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnerSteps;
