import React, { useState } from 'react';
import { Modal, Input, Button, message, Select } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import { supportApi } from '@/features/support/api/support';
import { useNavigate } from 'react-router-dom';
import '@/styles/support.css';

const { TextArea } = Input;
const { Option } = Select;

interface SupportButtonProps {
  type?: 'float' | 'button';
}

const SupportButton: React.FC<SupportButtonProps> = ({ type = 'float' }) => {
  const navigate = useNavigate();

  // Проверяем авторизацию - показываем кнопку только для авторизованных пользователей
  const token = localStorage.getItem('access_token');
  if (!token) {
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
