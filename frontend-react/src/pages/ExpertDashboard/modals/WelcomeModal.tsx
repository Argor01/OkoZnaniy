import React from 'react';
import { Modal, Button, Typography } from 'antd';
import styles from '../ExpertDashboard.module.css';

const { Paragraph } = Typography;

interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
  userProfile?: { username?: string; email?: string } | null;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ visible, onClose, userProfile }) => {
  return (
    <Modal
      title={
        <div className={styles.welcomeModalTitle}>
          Регистрация прошла успешно!
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={[
        <Button
          key="submit"
          type="primary"
          size="large"
          onClick={onClose}
          className={styles.welcomeModalButton}
        >
          Понятно
        </Button>
      ]}
      width={700}
      wrapClassName={styles.welcomeModalWrap}
    >
      <div className={styles.welcomeModalContent}>
        <Paragraph className={styles.welcomeModalIntro}>
          Добро пожаловать на сервис помощи студентам ОкоЗнаний,
        </Paragraph>
        
        <Paragraph className={styles.welcomeModalName}>
          {userProfile?.username || userProfile?.email || 'Пользователь'}!
        </Paragraph>

        <Paragraph className={styles.welcomeModalText}>
          Для того, чтобы заказчики размещали больше заказов по вашему профилю и выбирали именно Вас, Вам необходимо заполнить в профиле следующую информацию:
        </Paragraph>

        <div className={styles.welcomeModalList}>
          <Paragraph className={styles.welcomeModalListItem}>
            <strong>1.</strong> Специализации, с которыми Вы можете помочь заказчикам.
          </Paragraph>
          <Paragraph className={styles.welcomeModalListItem}>
            <strong>2.</strong> Описание профиля – здесь можете указать любую информацию о себе: образование, опыт работы, типы работ с которыми помогаете, график работы и другую индивидуальную информацию о себе
          </Paragraph>
          <Paragraph className={styles.welcomeModalListItemLast}>
            <strong>3.</strong> Загрузите оригинальную аватарку – чтобы выделяться на фоне остальных исполнителей
          </Paragraph>
        </div>

        <Paragraph className={styles.welcomeModalText}>
          Для комфортной работы, Вы можете ознакомиться с нашим разделом <strong>FAQ</strong>. По всем вопросам, касающихся работы сервиса, можете обращаться к нашему администратору <strong>Admin</strong>
        </Paragraph>

        <Paragraph className={styles.welcomeModalFooter}>
          Желаем легких заказов и высоких доходов!
        </Paragraph>
      </div>
    </Modal>
  );
};

export default WelcomeModal;
