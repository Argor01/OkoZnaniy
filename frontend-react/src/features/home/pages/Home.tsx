import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SEO } from '@/features/common';
import { 
  Header,
  FirstScreen,
  PlaceTask,
  Advantages,
  Prices,
  OnlyPro,
  Reviews,
  LeaveOrder,
  About,
  FAQ,
  PlaceTaskInfo,
  Footer
} from '@/features/landing';
import '@/styles/landing.css';
import '@/styles/page-transitions.css';

const Home: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    
    const refCode = searchParams.get('ref');
    if (refCode) {
      localStorage.setItem('referral_code', refCode);
    }
  }, [searchParams]);
  return (
    <div className="page-wrapper landing-page">
      <SEO 
        title="Око Знаний - Онлайн сервис помощи студентам | Курсовые, Дипломы, Рефераты"
        description="Онлайн сервис помощи студентам: быстро, надёжно, по выгодной цене. Экономьте время: разместите задание и эксперт быстро поможет с консультацией. Курсовые, дипломы, рефераты, контрольные работы."
        keywords="помощь студентам, написание работ, курсовые работы, дипломные работы, рефераты, контрольные работы, эссе, онлайн помощь, студенческие работы, заказать работу, помощь с учебой, консультации студентам"
        ogTitle="Око Знаний - Помощь студентам онлайн"
        ogDescription="Разместите задание и получите помощь от профессиональных экспертов. Быстро, надёжно, по выгодной цене."
        ogUrl="https://okoznaniy.ru"
        canonical="https://okoznaniy.ru"
      />
      <Header />
      <main className="main">
        <FirstScreen />
        <PlaceTask />
        <Advantages />
        <Prices />
        <OnlyPro />
        <Reviews />
        <LeaveOrder />
        <About />
        <FAQ />
        <PlaceTaskInfo />
      </main>
      <Footer />
    </div>
  );
};

export default Home;
