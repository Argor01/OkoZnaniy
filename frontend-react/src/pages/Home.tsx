import React, { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import Header from '../components/landing/sections/Header';
import FirstScreen from '../components/landing/sections/FirstScreen';
import PlaceTask from '../components/landing/sections/PlaceTask';
import Advantages from '../components/landing/sections/Advantages';
import Prices from '../components/landing/sections/Prices';
import OnlyPro from '../components/landing/sections/OnlyPro';
import Reviews from '../components/landing/sections/Reviews';
import LeaveOrder from '../components/landing/sections/LeaveOrder';
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
      console.log('Реферальный код сохранен:', refCode);
    }
  }, [searchParams]);
  return (
    <>
      <Header />
      <main className="main">
        <FirstScreen />
        <PlaceTask />
        <Advantages />
        <Prices />
        <OnlyPro />
        <Reviews />
        <LeaveOrder />
        <FAQ />
        <PlaceTaskInfo />
      </main>
      <Footer />
    </>
  );
};

export default Home;
