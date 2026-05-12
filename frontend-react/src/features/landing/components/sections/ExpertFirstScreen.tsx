import React from 'react';
import { useNavigate } from 'react-router-dom';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './FirstScreen.module.css';

const ExpertFirstScreen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className={`${styles.firstScreen} ${styles.expertFirstScreen}`}>
      <div className={landingStyles.mcontainer}>
        <div className={styles.firstScreenWrapper}>
          <div className={styles.firstScreenContent}>
            <h1 className={styles.firstScreenContentTitle}>
              Стань автором студенческих работ
            </h1>
            <div className={styles.firstScreenContentDescripton}>
              и зарабатывай от 100 000 ₽ в месяц
            </div>
            <div className={styles.firstScreenContentButtons}>
              <button
                className={`${styles.firstScreenContentButtonsTask} ${landingStyles.button}`}
                onClick={() => navigate('/expert-application')}
              >
                Стать экспертом
              </button>
            </div>
            <div className={styles.expertFirstScreenStats}>
              <div className={styles.expertFirstScreenStat}>
                <span className={styles.expertFirstScreenStatValue}>5 000+</span>
                <span className={styles.expertFirstScreenStatLabel}>активных заказов</span>
              </div>
              <div className={styles.expertFirstScreenStat}>
                <span className={styles.expertFirstScreenStatValue}>от 500 ₽</span>
                <span className={styles.expertFirstScreenStatLabel}>за одну работу</span>
              </div>
              <div className={styles.expertFirstScreenStat}>
                <span className={styles.expertFirstScreenStatValue}>24/7</span>
                <span className={styles.expertFirstScreenStatLabel}>поддержка</span>
              </div>
            </div>
          </div>

          <figure className={styles.firstScreenFigure}>
            <img
              className={styles.firstScreenFigureImage}
              src="/assets/first-screen/first-screen-expert.png"
              alt="expert"
              width={811}
              height={879}
            />
          </figure>
        </div>
      </div>
    </section>
  );
};

export default ExpertFirstScreen;
