import React, { useState } from 'react';
import { Modal, Input, Button, message, Select } from 'antd';
import { CustomerServiceOutlined } from '@ant-design/icons';
import { supportApi } from '../api/support';
import { useNavigate } from 'react-router-dom';

const { TextArea } = Input;
const { Option } = Select;

interface SupportButtonProps {
  type?: 'float' | 'button';
}

const SupportButton: React.FC<SupportButtonProps> = ({ type = 'float' }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [subject, setSubject] = useState('Помощь в размещении заказа');
  const [messageText, setMessageText] = useState('');
  const [priority, setPriority] = useState('medium');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
    setSubject('Помощь в размещении заказа');
    setMessageText('');
    setPriority('medium');
  };

  const handleSubmit = async () => {
    if (!messageText.trim()) {
      message.warning('Пожалуйста, опишите ваш вопрос');
      return;
    }

    setLoading(true);
    try {
      const chat = await supportApi.createChat({
        subject,
        message: messageText,
        priority,
      });

      message.success('Обращение создано! Администратор скоро ответит');
      setIsModalVisible(false);
      setMessageText('');
      
      
      navigate(`/support-chat/${chat.id}`);
    } catch (error) {
      console.error('Ошибка создания обращения:', error);
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

          <div className="supportField">
            <label className="supportLabel">
              Приоритет
            </label>
            <Select
              value={priority}
              onChange={setPriority}
              className="supportSelect"
            >
              <Option value="low">Низкий</Option>
              <Option value="medium">Средний</Option>
              <Option value="high">Высокий</Option>
              <Option value="urgent">Срочный</Option>
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

        <div className="supportField">
          <label className="supportLabel">
            Приоритет
          </label>
          <Select
            value={priority}
            onChange={setPriority}
            className="supportSelect"
          >
            <Option value="low">Низкий</Option>
            <Option value="medium">Средний</Option>
            <Option value="high">Высокий</Option>
            <Option value="urgent">Срочный</Option>
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
