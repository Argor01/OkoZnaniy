import React from 'react';
import { SEO } from '@/features/common';
import {
  Header,
  PartnerFirstScreen,
  PartnerBenefits,
  PartnerSteps,
  FeedbackForm,
  Footer
} from '@/features/landing';
import '@/styles/landing.css';
import '@/styles/become-pages.css';
import '@/styles/page-transitions.css';

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
