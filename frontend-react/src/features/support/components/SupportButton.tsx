import React, { useState } from 'react';
import { Modal, Input, Button, message, Select } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import { supportApi } from '@/features/support/api/support';
import { useNavigate, useLocation } from 'react-router-dom';
import '@/styles/support.css';

const { TextArea } = Input;
const { Option } = Select;

interface SupportButtonProps {
  type?: 'float' | 'button';
}

const SupportButton: React.FC<SupportButtonProps> = ({ type = 'float' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [shouldShow, setShouldShow] = React.useState<boolean | null>(null);

  // Проверяем авторизацию - показываем кнопку только для авторизованных пользователей
  const token = localStorage.getItem('access_token');
  
  // Скрываем кнопку на главной странице (лендинге)
  if (location.pathname === '/' || location.pathname === '/home') {
    return null;
  }

  if (!token) {
    return null;
  }

  // Проверяем роль пользователя
  React.useEffect(() => {
    const checkUserRole = async () => {
      // Сначала проверяем localStorage
      const userRole = localStorage.getItem('user_role');
      if (userRole === 'admin' || userRole === 'director') {
        setShouldShow(false);
        return;
      }

      // Если роли нет в localStorage, получаем из API
      if (!userRole) {
        try {
          const response = await fetch('/api/users/me/', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          if (response.ok) {
            const data = await response.json();
            if (data?.role) {
              localStorage.setItem('user_role', data.role);
              if (data.role === 'admin' || data.role === 'director') {
                setShouldShow(false);
                return;
              }
            }
          }
        } catch (error) {
          console.error('Ошибка получения роли пользователя:', error);
        }
      }
      
      // Если дошли сюда, показываем кнопку
      setShouldShow(true);
    };

    checkUserRole();
  }, [token]);

  // Пока проверяем роль, не показываем кнопку
  if (shouldShow === null) {
    return null;
  }

  // Не показываем кнопку для админов и директоров
  if (!shouldShow) {
    return null;
  }

  const handleSupportClick = async () => {
    // Получаем ID пользователя поддержки
    let supportUserId = localStorage.getItem('support_user_id');
    
    if (!supportUserId) {
      try {
        const response = await fetch('/api/users/support_user/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          if (data?.id) {
            localStorage.setItem('support_user_id', String(data.id));
            supportUserId = String(data.id);
          }
        }
      } catch (error) {
        console.error('Ошибка получения support user ID:', error);
      }
    }
    
    // Отправляем событие для открытия чата с поддержкой
    window.dispatchEvent(new CustomEvent('openSupportChat', { 
      detail: { supportUserId: supportUserId ? Number(supportUserId) : null } 
    }));
  };

  if (type === 'float') {
    return (
      <div className="supportButtonFloatWrapper">
        <Button
          type="primary"
          shape="circle"
          size="large"
          icon={<CustomerServiceOutlined />}
          onClick={handleSupportClick}
          className="supportButtonFloat"
          title="Техническая поддержка"
        />
      </div>
    );
  }

  
  return (
    <Button
      type="default"
      icon={<CustomerServiceOutlined />}
      onClick={handleSupportClick}
    >
      Поддержка
    </Button>
  );
};

export default SupportButton;
