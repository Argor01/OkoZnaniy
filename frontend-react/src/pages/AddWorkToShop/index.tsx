import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout, Typography, Button, message } from 'antd';
import { MenuOutlined, LogoutOutlined } from '@ant-design/icons';
import Sidebar from '../../components/layout/Sidebar';
import WorkForm from './components/WorkForm';
import { authApi } from '../../api/auth';
import { WorkFormData } from './types.js';
import styles from './AddWorkToShop.module.css';

const { Content, Header } = Layout;
const { Title } = Typography;

const AddWorkToShop: React.FC = () => {
  const navigate = useNavigate();
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [isMobile] = useState(window.innerWidth <= 768);

  // Загрузка профиля пользователя
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Обработчики навигации
  const handleMenuSelect = (key: string) => {
    // Навигация обрабатывается в Sidebar
  };

  const handleLogout = async () => {
    try {
      await authApi.logout();
      navigate('/login');
    } catch (error) {
      message.error('Ошибка при выходе');
    }
  };

  // Обработчик сохранения формы
  const handleSaveWork = (formData: WorkFormData) => {
    console.log('Saving work:', formData);
    message.success('Работа успешно добавлена!');
    navigate('/shop/ready-works');
  };

  const handleCancel = () => {
    navigate('/shop/ready-works');
  };

  return (
    <Layout className={styles.layout}>
      <Sidebar
        selectedKey="shop-add-work"
        onMenuSelect={handleMenuSelect}
        onLogout={handleLogout}
        mobileDrawerOpen={mobileMenuVisible}
        onMobileDrawerChange={setMobileMenuVisible}
        userProfile={
          profile
            ? {
                username: profile.username,
                avatar: profile.avatar,
                role: profile.role,
              }
            : undefined
        }
      />

      <Layout className={styles.mainLayout}>
        <Header className={styles.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {isMobile && (
              <Button
                type="primary"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuVisible(true)}
                style={{
                  borderRadius: '8px',
                  background: '#3b82f6',
                  border: 'none',
                }}
              />
            )}
            <Title level={isMobile ? 4 : 3} style={{ margin: 0, color: '#1f2937' }}>
              Добавить новую работу
            </Title>
          </div>
          <Button
            type="default"
            danger
            icon={<LogoutOutlined />}
            onClick={handleLogout}
            style={{ borderRadius: '8px' }}
          >
            {!isMobile && 'Выйти'}
          </Button>
        </Header>

        <Content className={styles.content}>
          <div className={styles.formContainer}>
            <WorkForm onSave={handleSaveWork} onCancel={handleCancel} />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AddWorkToShop;
