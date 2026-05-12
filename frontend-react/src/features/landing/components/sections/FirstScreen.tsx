import React from 'react';
import { useNavigate } from 'react-router-dom';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './FirstScreen.module.css';

const FirstScreen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className={styles.firstScreen}>
      <div className={landingStyles.mcontainer}>
        <div className={styles.firstScreenWrapper}>
          <div className={styles.firstScreenContent}>
            <h1 className={styles.firstScreenContentTitle}>
              Онлайн сервис помощи студентам: быстро, надёжно, по выгодной цене
            </h1>
            <div className={styles.firstScreenContentDescripton}>
              Экономьте время: Разместите задание, и эксперт быстро поможет с консультацией
            </div>
            <div className={styles.firstScreenContentButtons}>
              <button className={`${styles.firstScreenContentButtonsTask} ${landingStyles.button}`} onClick={() => navigate('/create-order')}>
                Разместить задание
              </button>
              <button className={`${styles.firstScreenContentButtonsExpert} ${landingStyles.button}`} onClick={() => navigate('/become-expert')}>Стать экспертом</button>
            </div>
          </div>

          <figure className={styles.firstScreenFigure}>
            <img
              className={styles.firstScreenFigureImage}
              src="/assets/first-screen/first-screen-students.png"
              alt="students"
              width={811}
              height={879}
            />
          </figure>
        </div>
      </div>
    </section>
  );
};

export default FirstScreen;



