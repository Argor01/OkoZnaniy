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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [subject, setSubject] = useState('Помощь в размещении заказа');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Автоматическое определение приоритета по теме
  const getPriorityBySubject = (subject: string): string => {
    switch (subject) {
      case 'Технические проблемы':
        return 'high'; // Высокий приоритет для технических проблем
      case 'Проблема с заказом':
        return 'high'; // Высокий приоритет для проблем с заказами
      case 'Вопрос по оплате':
        return 'medium'; // Средний приоритет для вопросов по оплате
      case 'Помощь в размещении заказа':
        return 'low'; // Низкий приоритет для помощи в размещении
      case 'Другое':
        return 'medium'; // Средний приоритет для прочих вопросов
      default:
        return 'medium';
    }
  };

  // Слушаем событие для открытия модального окна
  React.useEffect(() => {
    const handleOpenSupportModal = () => {
      setIsModalVisible(true);
    };

    window.addEventListener('openSupportModal', handleOpenSupportModal);
    return () => {
      window.removeEventListener('openSupportModal', handleOpenSupportModal);
    };
  }, []);

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSubject('Помощь в размещении заказа');
    setMessageText('');
  };

  const handleSubmit = async () => {
    if (!messageText.trim()) {
      message.warning('Пожалуйста, опишите ваш вопрос');
      return;
    }

    const priority = getPriorityBySubject(subject);
    console.log('🔧 Создание чата поддержки:', { subject, messageText, priority });
    setLoading(true);
    try {
      const chat = await supportApi.createChat({
        subject,
        message: messageText,
        priority,
      });

      console.log('✅ Чат создан:', chat);
      message.success('Обращение создано! Администратор скоро ответит');
      setIsModalVisible(false);
      setMessageText('');
      
      // Переходим на страницу чата поддержки
      navigate(`/support-chat/${chat.id}`);
      
    } catch (error) {
      console.error('❌ Ошибка создания обращения:', error);
      message.error('Не удалось создать обращение');
    } finally {
      setLoading(false);
    }
  };

  if (type === 'float') {
    return (
      <>
        <div className="supportButtonFloatWrapper">
          <Button
            type="primary"
            shape="circle"
            size="large"
            icon={<CustomerServiceOutlined />}
            onClick={showModal}
            className="supportButtonFloat"
            title="Техническая поддержка"
          />
        </div>

        <Modal
          title="Обращение в техническую поддержку"
          open={isModalVisible}
          onCancel={handleCancel}
          footer={[
            <Button key="cancel" onClick={handleCancel}>
              Отмена
            </Button>,
            <Button
              key="submit"
              type="primary"
              loading={loading}
              onClick={handleSubmit}
            >
              Отправить
            </Button>,
          ]}
          width={600}
        >
          <div className="supportField">
            <label className="supportLabel">
              Тема обращения
            </label>
            <Select
              value={subject}
              onChange={setSubject}
              className="supportSelect"
            >
              <Option value="Помощь в размещении заказа">Помощь в размещении заказа</Option>
              <Option value="Вопрос по оплате">Вопрос по оплате</Option>
              <Option value="Проблема с заказом">Проблема с заказом</Option>
              <Option value="Технические проблемы">Технические проблемы</Option>
              <Option value="Другое">Другое</Option>
            </Select>
          </div>

          <div>
            <label className="supportLabel">
              Опишите ваш вопрос
            </label>
            <TextArea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Подробно опишите вашу проблему или вопрос..."
              rows={6}
              maxLength={1000}
              showCount
            />
          </div>

          <div className="supportHint">
            💡 Администратор ответит вам в ближайшее время. Вы получите уведомление о новом сообщении.
          </div>
        </Modal>
      </>
    );
  }

  
  return (
    <>
      <Button
        type="default"
        icon={<CustomerServiceOutlined />}
        onClick={showModal}
      >
        Поддержка
      </Button>

      <Modal
        title="Обращение в техническую поддержку"
        open={isModalVisible}
        onCancel={handleCancel}
        footer={[
          <Button key="cancel" onClick={handleCancel}>
            Отмена
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handleSubmit}
          >
            Отправить
          </Button>,
        ]}
        width={600}
      >
        <div className="supportField">
          <label className="supportLabel">
            Тема обращения
          </label>
          <Select
            value={subject}
            onChange={setSubject}
            className="supportSelect"
          >
            <Option value="Помощь в размещении заказа">Помощь в размещении заказа</Option>
            <Option value="Вопрос по оплате">Вопрос по оплате</Option>
            <Option value="Проблема с заказом">Проблема с заказом</Option>
            <Option value="Технические проблемы">Технические проблемы</Option>
            <Option value="Другое">Другое</Option>
          </Select>
        </div>

        <div>
          <label className="supportLabel">
            Опишите ваш вопрос
          </label>
          <TextArea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Подробно опишите вашу проблему или вопрос..."
            rows={6}
            maxLength={1000}
            showCount
          />
        </div>

        <div className="supportHint">
          💡 Администратор ответит вам в ближайшее время. Вы получите уведомление о новом сообщении.
        </div>
      </Modal>
    </>
  );
};

export default SupportButton;
