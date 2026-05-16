import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './PlaceTaskInfo.module.css';


const PlaceTaskInfo: React.FC = () => {
  const navigate = useNavigate();
  const wrapperRef = useScrollAnimation<HTMLDivElement>('zoom-in');

  return (
    <section className={styles.placeTaskInfo}>
      <div className={landingStyles.mcontainer}>
        <div ref={wrapperRef} className={styles.placeTaskInfoWrapper}>
          <div className={styles.placeTaskInfoClient}>
            <div className={styles.placeTaskInfoClientTitle}>Для заказчика</div>
            <button className={`${styles.placeTaskInfoClientButton} ${landingStyles.button}`} onClick={() => navigate('/create-order')}>Разместить задание</button>
          </div>

          <div className={styles.placeTaskInfoExpert}>
            <div className={styles.placeTaskInfoExpertTitle}>Для экспертов</div>
            <button className={`${styles.placeTaskInfoExpertButton} ${landingStyles.button}`} onClick={() => navigate('/become-expert')}>Стать экспертом</button>
          </div>

          <figure className={styles.placeTaskInfoPhoto}>
            <img className={styles.placeTaskInfoPhotoImage} src="/assets/place-task-info/place-task-info-photo.png" alt="teacher" width={695} height={560} />
          </figure>
        </div>
      </div>
    </section>
  );
};

export default PlaceTaskInfo;



