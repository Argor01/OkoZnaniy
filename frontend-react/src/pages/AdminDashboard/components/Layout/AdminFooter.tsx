import React from 'react';
import { Layout, Typography, Space, Divider } from 'antd';
import { CopyrightOutlined, HeartFilled } from '@ant-design/icons';
import styles from './AdminFooter.module.css';

const { Footer } = Layout;
const { Text, Link } = Typography;

/**
 * Футер админской панели
 * Отображается только на десктопе
 */
export const AdminFooter: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <Footer className={styles.footer}>
      <div className={styles.content}>
        <Space split={<Divider type="vertical" />} className={styles.links}>
          <Text type="secondary">
            <CopyrightOutlined /> {currentYear} Личный кабинет администратора
          </Text>
          
          <Link href="#" className={styles.link}>
            Документация
          </Link>
          
          <Link href="#" className={styles.link}>
            Поддержка
          </Link>
          
          <Link href="#" className={styles.link}>
            API
          </Link>
        </Space>

        <Text type="secondary" className={styles.madeWith}>
          Сделано с <HeartFilled style={{ color: '#ff4d4f' }} /> командой разработки
        </Text>
      </div>
    </Footer>
  );
};