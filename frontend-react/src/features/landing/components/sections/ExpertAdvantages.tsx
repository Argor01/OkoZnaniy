import React from 'react';
import '@/styles/expert-advantages.css';

const advantages = [
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
      </svg>
    ),
    title: 'Большой поток заказов',
    text: 'Тысячи студентов ежедневно размещают задания — выбирай подходящие',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
      </svg>
    ),
    title: 'Сам ставишь цену',
    text: 'Выбираешь задание и предлагаешь свою ставку — никаких фиксированных тарифов',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    ),
    title: 'Гибкий график',
    text: 'Работай когда удобно — утром, вечером или в выходные',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
      </svg>
    ),
    title: 'Полностью удалённо',
    text: 'Работай из любой точки мира — нужен только компьютер и интернет',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: '100% гарантия оплаты',
    text: 'Деньги хранятся на эскроу-счёте — получишь оплату после сдачи работы',
  },
  {
    icon: (
      <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
      </svg>
    ),
    title: 'Прямой контакт с заказчиком',
    text: 'Общайся напрямую, уточняй детали и получай обратную связь',
  },
];

const ExpertAdvantages: React.FC = () => {
  return (
    <section className="expert-advantages">
      <div className="mcontainer">
        <h2 className="expert-advantages__title">Почему выбирают нас</h2>
        <p className="expert-advantages__subtitle">Всё что нужно для комфортной удалённой работы</p>
        <div className="expert-advantages__grid">
          {advantages.map((item, i) => (
            <div className="expert-advantages__card" key={i}>
              <div className="expert-advantages__card-icon">{item.icon}</div>
              <div className="expert-advantages__card-title">{item.title}</div>
              <div className="expert-advantages__card-text">{item.text}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ExpertAdvantages;
