import React from 'react';
import SEO from '../components/SEO';
import Header from '../components/landing/sections/Header';
import PartnerFirstScreen from '../components/landing/sections/PartnerFirstScreen';
import PartnerBenefits from '../components/landing/sections/PartnerBenefits';
import PartnerSteps from '../components/landing/sections/PartnerSteps';
import FeedbackForm from '../components/landing/sections/FeedbackForm';
import Footer from '../components/landing/sections/Footer';

const BecomePartner: React.FC = () => {
  return (
    <div className="page-wrapper partner-page">
      <SEO 
        title="Стать партнером - Око Знаний | Гарантируем 1 000 000 ₽ оборот"
        description="Бизнес с Око Знаний - это просто! Гарантируем 1 000 000 ₽ оборот вашего агентства через 2 месяца. Персональная поддержка от директора биржи. Получай 25% от заказа."
        keywords="франшиза, бизнес партнерство, заработок онлайн, образовательный бизнес, партнерская программа, франчайзинг"
        ogTitle="Стать партнером - Развивай бизнес с Око Знаний"
        ogDescription="Гарантируем 1 000 000 ₽ оборот через 2 месяца. Получай 25% от каждого заказа. Персональная поддержка."
        ogUrl="https://okoznaniy.ru/become-partner"
        canonical="https://okoznaniy.ru/become-partner"
      />
      <Header />
      <main className="main">
        <PartnerFirstScreen />
        <PartnerBenefits />
        <PartnerSteps />
        <FeedbackForm buttonText="Стать партнером" />
      </main>
      <Footer />
    </div>
  );
};

export default BecomePartner;
