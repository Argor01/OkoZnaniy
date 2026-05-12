import React from 'react';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './PartnerBenefits.module.css';

const benefits = [
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
    value: '25%',
    title: 'Комиссия с каждого заказа',
    text: 'Получай 25% от суммы каждого заказа на протяжении полугода',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
      </svg>
    ),
    value: '7 дней',
    title: 'До первой прибыли',
    text: 'Начинай зарабатывать практически сразу после запуска',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    value: '1 на 1',
    title: 'Поддержка директора',
    text: 'Персональная поддержка от директора биржи на протяжении первого месяца',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    value: '100%',
    title: 'Работа онлайн',
    text: 'Без офиса — работай из любой точки мира',
  },
];

const PartnerBenefits: React.FC = () => {
  return (
    <section className={styles.partnerBenefitsSection}>
      <div className={landingStyles.mcontainer}>
        <h2 className={styles.partnerBenefitsSectionTitle}>Преимущества партнёрства</h2>
        <p className={styles.partnerBenefitsSectionSubtitle}>Получайте стабильный доход и развивайте свой бизнес с нашей поддержкой</p>
        <div className={styles.partnerBenefitsSectionGrid}>
          {benefits.map((item, i) => (
            <div className={styles.partnerBenefitsSectionCard} key={i}>
              <div className={styles.partnerBenefitsSectionCardIcon}>{item.icon}</div>
              <div className={styles.partnerBenefitsSectionCardValue}>{item.value}</div>
              <div className={styles.partnerBenefitsSectionCardTitle}>{item.title}</div>
              <div className={styles.partnerBenefitsSectionCardText}>{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PartnerBenefits;
