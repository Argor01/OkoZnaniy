import React from 'react';
import { Modal, Button, Typography } from 'antd';

const { Paragraph } = Typography;

interface WelcomeModalProps {
  visible: boolean;
  onClose: () => void;
  userProfile?: any;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ visible, onClose, userProfile }) => {
  return (
    <Modal
      title={
        <div style={{ 
          fontSize: 24, 
          fontWeight: 600, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text'
        }}>
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
          style={{
            borderRadius: 12,
            height: 44,
            fontSize: 16,
            fontWeight: 500,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            border: 'none'
          }}
        >
          Понятно
        </Button>
      ]}
      width={700}
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        content: { 
          borderRadius: 24, 
          padding: 0,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
        },
        header: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '24px 32px',
          borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: '24px 24px 0 0'
        },
        body: {
          padding: '32px',
          background: 'rgba(255, 255, 255, 0.95)'
        },
        footer: {
          padding: '24px 32px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderTop: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: '0 0 24px 24px'
        }
      }}
    >
      <div style={{ lineHeight: 1.8, fontSize: 15, color: '#333' }}>
        <Paragraph style={{ fontSize: 16, marginBottom: 20, fontWeight: 500 }}>
          Добро пожаловать на сервис помощи студентам ОкоЗнаний,
        </Paragraph>
        
        <Paragraph style={{ fontSize: 16, marginBottom: 20, fontWeight: 600, color: '#667eea' }}>
          {userProfile?.username || userProfile?.email || 'Пользователь'}!
        </Paragraph>

        <Paragraph style={{ fontSize: 15, marginBottom: 16 }}>
          Для того, чтобы заказчики размещали больше заказов по вашему профилю и выбирали именно Вас, Вам необходимо заполнить в профиле следующую информацию:
        </Paragraph>

        <div style={{ marginLeft: 20, marginBottom: 20 }}>
          <Paragraph style={{ marginBottom: 12 }}>
            <strong>1.</strong> Специализации, с которыми Вы можете помочь заказчикам.
          </Paragraph>
          <Paragraph style={{ marginBottom: 12 }}>
            <strong>2.</strong> Описание профиля – здесь можете указать любую информацию о себе: образование, опыт работы, типы работ с которыми помогаете, график работы и другую индивидуальную информацию о себе
          </Paragraph>
          <Paragraph style={{ marginBottom: 0 }}>
            <strong>3.</strong> Загрузите оригинальную аватарку – чтобы выделяться на фоне остальных исполнителей
          </Paragraph>
        </div>

        <Paragraph style={{ fontSize: 15, marginBottom: 16 }}>
          Для комфортной работы, Вы можете ознакомиться с нашим разделом <strong>FAQ</strong>. По всем вопросам, касающихся работы сервиса, можете обращаться к нашему администратору <strong>Admin</strong>
        </Paragraph>

        <Paragraph style={{ fontSize: 15, marginTop: 20, fontWeight: 600, color: '#667eea', textAlign: 'center' }}>
          Желаем легких заказов и высоких доходов!
        </Paragraph>
      </div>
    </Modal>
  );
};

export default WelcomeModal;
