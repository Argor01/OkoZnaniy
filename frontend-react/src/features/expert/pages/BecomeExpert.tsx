import React from 'react';
import { SEO } from '@/features/common';
import {
  Header,
  ExpertFirstScreen,
  ExpertAdvantages,
  FeedbackForm,
  Footer
} from '@/features/landing';
import '@/styles/become-pages.css';
import '@/styles/page-transitions.css';

const BecomeExpert: React.FC = () => {
  return (
    <div className="page-wrapper expert-page">
      <SEO 
        title="Стать экспертом - Око Знаний | Зарабатывай от 100 000 ₽ в месяц"
        description="Стань автором студенческих работ и зарабатывай от 100 000 ₽ в месяц. Большой поток заказов, гибкий график, удаленная работа. Начни работать прямо сейчас!"
        keywords="работа для студентов, удаленная работа, написание работ, заработок на знаниях, фриланс для студентов, работа экспертом"
        ogTitle="Стать экспертом - Зарабатывай на своих знаниях"
        ogDescription="Большой поток заказов, гибкий график работы, удаленная работа. Зарабатывай от 100 000 ₽ в месяц."
        ogUrl="https://okoznaniy.ru/become-expert"
        canonical="https://okoznaniy.ru/become-expert"
      />
      <Header />
      <main className="main">
        <ExpertFirstScreen />
        <ExpertAdvantages />
        <FeedbackForm buttonText="Отправить" />
      </main>
      <Footer />
    </div>
  );
};

export default BecomeExpert;
