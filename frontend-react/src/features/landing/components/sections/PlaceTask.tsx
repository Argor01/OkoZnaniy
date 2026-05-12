import React from 'react';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './PlaceTask.module.css';


const PlaceTask: React.FC = () => (
  <section className={styles.placeTask} id="services">
    <div className={landingStyles.mcontainer}>
      <div className={styles.placeTaskContent}>
        <h2 className={styles.placeTaskContentTitle}>
          Разместите задание - мы сами отправим его лучшим авторам
        </h2>
        <div className={styles.placeTaskContentDescription}>
          Наш сервис бесплатно отправит ваш запрос исполнителям, и вы получите предложения с
          ценами. Быстрее и удобнее, чем самостоятельный поиск в интернете!
        </div>
      </div>

      <div className={styles.placeTaskAdvantages}>
        <div className={styles.placeTaskAdvantagesCard}>
          <figure className={styles.placeTaskAdvantagesCardFigure}>
            <img
              className={styles.placeTaskAdvantagesCardFigureImage}
              src="/assets/place-task/place-task-icon-1.png"
              alt="icon"
              width={34}
              height={34}
            />
          </figure>
          <div className={styles.placeTaskAdvantagesCardText}>9.4 / 10 Оценка качества</div>
        </div>

        <div className={styles.placeTaskAdvantagesCard}>
          <figure className={styles.placeTaskAdvantagesCardFigure}>
            <img
              className={styles.placeTaskAdvantagesCardFigureImage}
              src="/assets/place-task/place-task-icon-2.png"
              alt="icon"
              width={34}
              height={34}
            />
          </figure>
          <div className={styles.placeTaskAdvantagesCardText}>400 000+ экспертов</div>
        </div>

        <div className={styles.placeTaskAdvantagesCard}>
          <figure className={styles.placeTaskAdvantagesCardFigure}>
            <img
              className={styles.placeTaskAdvantagesCardFigureImage}
              src="/assets/place-task/place-task-icon-3.png"
              alt="icon"
              width={34}
              height={34}
            />
          </figure>
          <div className={styles.placeTaskAdvantagesCardText}>Работаем 24/7</div>
        </div>
      </div>
    </div>
  </section>
);

export default PlaceTask;



