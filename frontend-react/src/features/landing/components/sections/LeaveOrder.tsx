import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useScrollAnimation } from '@/hooks/useScrollAnimation';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './LeaveOrder.module.css';


const LeaveOrder: React.FC = () => {
  const navigate = useNavigate();
  
  const handleOrderClick = () => {
    // Проверяем, авторизован ли пользователь
    const token = localStorage.getItem('access_token');
    
    if (token) {
      // Если авторизован, переходим на страницу создания заказа
      navigate('/create-order');
    } else {
      // Если не авторизован, переходим на страницу регистрации/входа
      navigate('/login');
    }
  };
  
  const titleRef = useScrollAnimation<HTMLHeadingElement>('fade-up');
  const stepsRef = useScrollAnimation<HTMLDivElement>('fade-up-stagger');

  return (
    <section className={styles.leaveOrder} id="orders">
      <div className={landingStyles.mcontainer}>
        <h2 ref={titleRef} className={styles.leaveOrderTitle}>Закажи работу за три шага 🤝</h2>

        <div className={styles.leaveOrderSteps}>
          <div ref={stepsRef} className={styles.leaveOrderStepsWrapper}>
            <div className={styles.leaveOrderStepsItem}>
              <div className={styles.leaveOrderStepsItemTitle}>Оставь заявку</div>
              <figure className={styles.leaveOrderStepsItemIcon}>
                <img
                  className={styles.leaveOrderStepsItemIconImage}
                  src="/assets/leave-order/leave-order-icon-1.svg"
                  alt="icons"
                  width={66}
                  height={66}
                />
              </figure>
              <div className={styles.leaveOrderStepsItemText}>
                Пару минут — и твоя задача уже доступна авторам
              </div>
            </div>

            <div className={styles.leaveOrderStepsItem}>
              <div className={styles.leaveOrderStepsItemTitle}>Выбери профессионала</div>
              <figure className={styles.leaveOrderStepsItemIcon}>
                <img
                  className={styles.leaveOrderStepsItemIconImage}
                  src="/assets/leave-order/leave-order-icon-2.svg"
                  alt="icons"
                  width={66}
                  height={66}
                />
              </figure>
              <div className={styles.leaveOrderStepsItemText}>
                Оцените анкеты специалистов, их рейтинг и отзывы
              </div>
            </div>

            <div className={styles.leaveOrderStepsItem}>
              <div className={styles.leaveOrderStepsItemTitle}>Забирай результат</div>
              <figure className={styles.leaveOrderStepsItemIcon}>
                <img
                  className={styles.leaveOrderStepsItemIconImage}
                  src="/assets/leave-order/leave-order-icon-3.svg"
                  alt="icons"
                  width={66}
                  height={66}
                />
              </figure>
              <div className={styles.leaveOrderStepsItemText}>
                Оплачивай — и скачивай готовую работу в своём личном кабинете
              </div>
            </div>
          </div>
        </div>

        <div className={styles.leaveOrderOrder}>
          <button className={`${styles.leaveOrderOrderButton} ${landingStyles.button}`} onClick={handleOrderClick}>Разместить заказ</button>
        </div>
      </div>
    </section>
  );
};

export default LeaveOrder;
