import React from 'react';
import { useNavigate } from 'react-router-dom';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './FirstScreen.module.css';

const PartnerFirstScreen: React.FC = () => {
  const navigate = useNavigate();
  return (
    <section className={`${styles.firstScreen} ${styles.partnerFirstScreen}`}>
      <div className={landingStyles.mcontainer}>
        <div className={styles.firstScreenWrapper}>
          <div className={styles.firstScreenContent}>
            <h1 className={styles.firstScreenContentTitle}>
              Бизнес с Око Знаний — это просто!
            </h1>
            <div className={styles.firstScreenContentDescripton}>
              Станьте партнером и развивайте свой бизнес вместе с нами
            </div>
            <div className={styles.firstScreenContentButtons}>
              <button
                className={`${styles.firstScreenContentButtonsTask} ${landingStyles.button}`}
                onClick={() => navigate('/become-partner#feedback')}
              >
                Стать партнёром
              </button>
            </div>
            <div className={styles.partnerFirstScreenStats}>
              <div className={styles.partnerFirstScreenStat}>
                <span className={styles.partnerFirstScreenStatValue}>25%</span>
                <span className={styles.partnerFirstScreenStatLabel}>от каждого заказа</span>
              </div>
              <div className={styles.partnerFirstScreenStat}>
                <span className={styles.partnerFirstScreenStatValue}>1 млн ₽</span>
                <span className={styles.partnerFirstScreenStatLabel}>оборот за 2 месяца</span>
              </div>
              <div className={styles.partnerFirstScreenStat}>
                <span className={styles.partnerFirstScreenStatValue}>7 дней</span>
                <span className={styles.partnerFirstScreenStatLabel}>до первой прибыли</span>
              </div>
            </div>
          </div>

          <figure className={`${styles.firstScreenFigure} ${styles.becomePageFigure}`}>
            <img
              className={`${styles.firstScreenFigureImage} ${styles.becomePageFigureImage}`}
              src="/assets/first-screen/first-screen-part.png"
              alt="partner"
              width={416}
              height={540}
            />
          </figure>
        </div>
      </div>
    </section>
  );
};

export default PartnerFirstScreen;
