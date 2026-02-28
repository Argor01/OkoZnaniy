import React from 'react';
import { Typography } from 'antd';
import { ShoppingOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { AppButton } from '@/components/ui/AppButton';
import styles from './EmptyState.module.css';

const { Title, Text } = Typography;

const EmptyState: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className={styles.container}>
      <div className={styles.iconWrapper}>
        <ShoppingOutlined className={styles.icon} />
      </div>
      <Title level={3} className={styles.title}>
        У вас пока нет купленных работ
      </Title>
      <Text className={styles.description}>
        Перейдите в магазин готовых работ, чтобы найти и купить нужную работу
      </Text>
      <AppButton
        variant="primary"
        size="large"
        onClick={() => navigate('/shop/ready-works')}
        className={styles.button}
      >
        Перейти в магазин
      </AppButton>
    </div>
  );
};

export default EmptyState;
