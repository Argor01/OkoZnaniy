import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { message } from 'antd';
import { SEO } from '@/features/common';
import { 
  Header,
  FirstScreen,
  PlaceTask,
  Advantages,
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
  const navigate = useNavigate();
  const [referralCode, setReferralCode] = useState<string | null>(null);
  
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      // Сохраняем реферальный код в localStorage
      localStorage.setItem('referral_code', refCode);
      setReferralCode(refCode);
      
      // Показываем уведомление
      message.success({
        content: `Реферальный код ${refCode} сохранен! Зарегистрируйтесь, чтобы получить бонусы.`,
        duration: 5,
        onClick: () => navigate('/login?ref=' + refCode)
      });
      
      // Автоматически перенаправляем на страницу регистрации через 2 секунды
      const timer = setTimeout(() => {
        navigate('/login?ref=' + refCode);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [searchParams, navigate]);
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
