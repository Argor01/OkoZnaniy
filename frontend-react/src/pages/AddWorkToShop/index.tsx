import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, Typography, Button, message } from 'antd';
import { MenuOutlined, LogoutOutlined } from '@ant-design/icons';
import Sidebar from '../../components/layout/Sidebar';
import WorkForm from './components/WorkForm';
import { authApi } from '../../api/auth';
import { WorkFormData } from './types';
import type { UploadFile } from 'antd';
import type { Work, WorkFile } from '../ShopReadyWorks/types';
import { shopApi } from '../../api/shop';
import styles from './AddWorkToShop.module.css';

const { Content, Header } = Layout;
const { Title } = Typography;

  const AddWorkToShop: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
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
    const subjectMap: Record<string, string> = {
      math: 'Математика',
      physics: 'Физика',
      chemistry: 'Химия',
      history: 'История',
      literature: 'Литература',
    };
    const typeCodeToRu: Record<string, string> = {
      practical: 'Практическая работа',
      control: 'Контрольная работа',
      essay: 'Эссе',
      coursework: 'Курсовая работа',
      thesis: 'Дипломная работа',
    };
    const categoryByTypeCode: Record<string, string> = {
      practical: 'Лабораторные работы',
      control: 'Контрольные работы',
      essay: 'Эссе',
      coursework: 'Курсовые работы',
      thesis: 'Дипломные работы',
    };

    const filesList = ((formData.files as UploadFile[]) || []).map<WorkFile>((f, idx) => {
      const url = f.url || (f.originFileObj ? URL.createObjectURL(f.originFileObj as File) : '#');
      const type = f.type || (f.name.includes('.') ? f.name.split('.').pop()! : 'file');
      return {
        id: idx + 1,
        name: f.name,
        type,
        size: f.size || 0,
        url,
      };
    });

    const now = new Date().toISOString();
    const newWork: Work = {
      id: Date.now(),
      title: formData.title,
      description: formData.description || '',
      price: formData.price || 0,
      category: categoryByTypeCode[formData.type] || 'Прочее',
      subject: subjectMap[formData.subject] || formData.subject || 'Прочее',
      workType: typeCodeToRu[formData.type] || 'Работа',
      rating: 0,
      reviewsCount: 0,
      viewsCount: 0,
      purchasesCount: 0,
      author: {
        id: profile?.id || 0,
        name: profile?.username || 'Автор',
        avatar: profile?.avatar,
        rating: 0,
      },
      preview: formData.coverImagePreview,
      files: filesList,
      tags: [],
      createdAt: now,
      updatedAt: now,
      isFavorite: false,
      originalPrice: undefined,
      discount: undefined,
    };

    const payload = {
      title: newWork.title,
      description: newWork.description,
      price: newWork.price,
      subject: newWork.subject,
      workType: newWork.workType,
      preview: newWork.preview,
      files: newWork.files.map(f => ({ name: f.name, type: f.type, size: f.size, url: f.url })),
    };

    shopApi.createWork(payload)
      .then(() => {
        message.success('Работа успешно добавлена!');
        queryClient.invalidateQueries({ queryKey: ['shop-works'] });
        navigate('/shop/ready-works');
      })
      .catch(() => {
        try {
          const key = 'shop_custom_works';
          const existing: Work[] = JSON.parse(localStorage.getItem(key) || '[]');
          const already = existing.some((w) => w.id === newWork.id);
          const next = already ? existing : [newWork, ...existing];
          localStorage.setItem(key, JSON.stringify(next));
          message.warning('Сервер недоступен. Работа сохранена локально');
        } catch {
          message.error('Не удалось сохранить работу на сервере');
        }
        navigate('/shop/ready-works');
      });
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
