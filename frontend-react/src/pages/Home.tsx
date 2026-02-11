import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import SEO from '../components/SEO';
import Header from '../components/landing/sections/Header';
import FirstScreen from '../components/landing/sections/FirstScreen';
import PlaceTask from '../components/landing/sections/PlaceTask';
import Advantages from '../components/landing/sections/Advantages';
import Prices from '../components/landing/sections/Prices';
import OnlyPro from '../components/landing/sections/OnlyPro';
import Reviews from '../components/landing/sections/Reviews';
import LeaveOrder from '../components/landing/sections/LeaveOrder';
import About from '../components/landing/sections/About';
import FAQ from '../components/landing/sections/FAQ';
import PlaceTaskInfo from '../components/landing/sections/PlaceTaskInfo';
import Footer from '../components/landing/sections/Footer';

const Home: React.FC = () => {
  const [searchParams] = useSearchParams();
  
  useEffect(() => {
    // Сохраняем реферальный код из URL в localStorage
    const refCode = searchParams.get('ref');
    if (refCode) {
      localStorage.setItem('referral_code', refCode);
    }
  }, [searchParams]);
  return (
    <div className="page-wrapper">
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
