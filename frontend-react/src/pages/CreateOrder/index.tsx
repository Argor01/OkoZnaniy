import React, { useState } from 'react';
import { Form, Input, InputNumber, Select, Button, Card, Typography, message, DatePicker } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import styles from './CreateOrder.module.css';

const { Title } = Typography;

const CreateOrder: React.FC = () => {
  const navigate = useNavigate();
  const [form] = Form.useForm();

  console.log('CreateOrder component rendering');

  const onFinish = (values: any) => {
    console.log('Form values:', values);
    message.success('Форма отправлена (тестовый режим)');
  };

  return (
    <div className={styles.container}>
      <Card className={styles.card} bordered={false}>
        <div className={styles.header}>
          <Title level={2} className={styles.title}>
            Создать заказ
          </Title>
          <Button 
            className={styles.buttonSecondary}
            onClick={() => navigate('/orders-feed')}
          >
            К ленте заказов
          </Button>
        </div>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={onFinish}
          initialValues={{
            deadline: dayjs().add(7, 'day'),
          }}
        >
          {/* Основная секция заказа */}
          <div className={styles.orderSection}>
            {/* Название работы */}
            <Form.Item
              name="title"
              label="Название работы"
              rules={[{ required: true, message: 'Введите название работы' }]}
            >
              <Input 
                placeholder="Введите название работы" 
                className={styles.titleInput}
              />
            </Form.Item>

            {/* Простые поля без сложной логики */}
            <div className={styles.typeSubjectDateRow}>
              <Form.Item
                name="work_type"
                label="Тип работы"
                rules={[{ required: true, message: 'Выберите тип работы' }]}
                className={styles.typeField}
              >
                <Select placeholder="Тип работы">
                  <Select.Option value="essay">Эссе</Select.Option>
                  <Select.Option value="coursework">Курсовая работа</Select.Option>
                  <Select.Option value="diploma">Дипломная работа</Select.Option>
                  <Select.Option value="report">Отчет</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="subject"
                label="Предмет"
                rules={[{ required: true, message: 'Выберите предмет' }]}
                className={styles.subjectField}
              >
                <Select placeholder="Предмет">
                  <Select.Option value="math">Математика</Select.Option>
                  <Select.Option value="physics">Физика</Select.Option>
                  <Select.Option value="chemistry">Химия</Select.Option>
                  <Select.Option value="history">История</Select.Option>
                </Select>
              </Form.Item>

              <Form.Item
                name="deadline"
                label="Дата сдачи"
                rules={[{ required: true, message: 'Выберите дату сдачи' }]}
                className={styles.dateField}
              >
                <DatePicker
                  placeholder="Дата сдачи"
                  format="DD.MM.YYYY"
                  disabledDate={(current) => current && current < dayjs().startOf('day')}
                  className={styles.dateInput}
                />
              </Form.Item>
            </div>

            {/* Описание работы */}
            <Form.Item
              name="description"
              label="Описание работы"
              rules={[{ required: true, message: 'Введите описание работы' }]}
            >
              <Input.TextArea
                placeholder="Введите описание работы"
                rows={6}
                className={styles.descriptionTextarea}
              />
            </Form.Item>

            {/* Стоимость */}
            <Form.Item
              name="budget"
              label="Стоимость (₽)"
              rules={[
                { required: true, message: 'Укажите стоимость' },
                { 
                  validator: (_, value) => {
                    if (value !== undefined && value !== null && Number(value) <= 0) {
                      return Promise.reject(new Error('Стоимость должна быть больше 0'));
                    }
                    return Promise.resolve();
                  }
                }
              ]}
            >
              <InputNumber
                placeholder="Стоимость"
                min={1}
                style={{ width: '100%' }}
                className={styles.priceInput}
              />
            </Form.Item>
          </div>

          {/* Кнопка отправки */}
          <Form.Item className={styles.submitSection}>
            <Button 
              type="primary" 
              htmlType="submit" 
              className={styles.submitButton}
              size="large"
            >
              Создать заказ
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default CreateOrder;