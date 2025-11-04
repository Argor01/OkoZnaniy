import React from 'react';
import SEO from '../components/SEO';
import Header from '../components/landing/sections/Header';
import ExpertFirstScreen from '../components/landing/sections/ExpertFirstScreen';
import ExpertAdvantages from '../components/landing/sections/ExpertAdvantages';
import FeedbackForm from '../components/landing/sections/FeedbackForm';
import Footer from '../components/landing/sections/Footer';

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
        <FeedbackForm buttonText="Стать экспертом" />
      </main>
      <Footer />
    </div>
  );
};

export default BecomeExpert;
