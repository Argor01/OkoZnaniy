import React from 'react';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './OnlyPro.module.css';


const OnlyPro: React.FC = () => {
  return (
    <section className={styles.onlyPro} id="be-expert">
      <div className={landingStyles.mcontainer}>
        <div className={styles.onlyProWrapper}>
          <figure className={styles.onlyProTeacher}>
            <img
              className={styles.onlyProTeacherImage}
              src="/assets/only-pro/only-pro-image.png"
              alt="teacher"
              width={952}
              height={901}
             
            />
          </figure>

          <div className={styles.onlyProMain}>
            <h2 className={styles.onlyProTitle}>Работают только профи</h2>
            <div className={styles.onlyProDescription}>ТОП универы, для нас важен диплом эксперта</div>

            <div className={styles.onlyProLogos}>
              <figure className={styles.onlyProLogosItem}>
                <img
                  className={styles.onlyProLogosItemImage}
                  src="/assets/only-pro/only-pro-icon-1.png"
                  alt="icon"
                  width={160}
                  height={94}
                />
              </figure>

              <figure className={styles.onlyProLogosItem}>
                <img
                  className={styles.onlyProLogosItemImage}
                  src="/assets/only-pro/only-pro-icon-2.png"
                  alt="icon"
                  width={160}
                  height={94}
                />
              </figure>

              <figure className={styles.onlyProLogosItem}>
                <img
                  className={styles.onlyProLogosItemImage}
                  src="/assets/only-pro/only-pro-icon-3.jpg"
                  alt="icon"
                  width={160}
                  height={94}
                />
              </figure>

              <figure className={styles.onlyProLogosItem}>
                <img
                  className={styles.onlyProLogosItemImage}
                  src="/assets/only-pro/only-pro-icon-4.jpg"
                  alt="icon"
                  width={160}
                  height={94}
                />
              </figure>

              <figure className={styles.onlyProLogosItem}>
                <img
                  className={styles.onlyProLogosItemImage}
                  src="/assets/only-pro/only-pro-icon-5.jpg"
                  alt="icon"
                  width={160}
                  height={94}
                />
              </figure>

              <figure className={styles.onlyProLogosItem}>
                <img
                  className={styles.onlyProLogosItemImage}
                  src="/assets/only-pro/only-pro-icon-6.png"
                  alt="icon"
                  width={160}
                  height={94}
                />
              </figure>

              <figure className={styles.onlyProLogosItem}>
                <img
                  className={styles.onlyProLogosItemImage}
                  src="/assets/only-pro/only-pro-icon-7.jpg"
                  alt="icon"
                  width={160}
                  height={94}
                />
              </figure>

              <figure className={styles.onlyProLogosItem}>
                <img
                  className={styles.onlyProLogosItemImage}
                  src="/assets/only-pro/only-pro-icon-8.jpg"
                  alt="icon"
                  width={160}
                  height={94}
                />
              </figure>
            </div>
            <div className={styles.onlyProAdditionalText}>и многие другие</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default OnlyPro;
