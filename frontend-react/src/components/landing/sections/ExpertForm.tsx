import React from 'react';
import { Form, Input, Button } from 'antd';

const ExpertForm: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    
  };

  return (
    <section className="leave-order" id="expert-form">
      <div className="mcontainer">
        <div className="leave-order__wrapper">
          <div className="leave-order__content">
            <h2 className="leave-order__content-title">Панель отправления заявки</h2>
            <p className="leave-order__content-description">
              Заполните форму, и мы свяжемся с вами в ближайшее время для обсуждения условий сотрудничества
            </p>
          </div>

          <div className="leave-order__form">
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              className="leave-order__form-wrapper"
            >
              <Form.Item
                name="fullName"
                rules={[{ required: true, message: 'Пожалуйста, введите ваше ФИО' }]}
              >
                <Input 
                  placeholder="ФИО" 
                  size="large"
                  className="partner-form__input"
                />
              </Form.Item>

              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Пожалуйста, введите email' },
                  { type: 'email', message: 'Введите корректный email' }
                ]}
              >
                <Input 
                  placeholder="Email" 
                  size="large"
                  className="partner-form__input"
                />
              </Form.Item>

              <Form.Item
                name="phone"
                rules={[{ required: true, message: 'Пожалуйста, введите телефон' }]}
              >
                <Input 
                  placeholder="Телефон" 
                  size="large"
                  className="partner-form__input"
                />
              </Form.Item>

              <Form.Item
                name="university"
                rules={[{ required: true, message: 'Пожалуйста, укажите университет' }]}
              >
                <Input 
                  placeholder="Университет" 
                  size="large"
                  className="partner-form__input"
                />
              </Form.Item>

              <Form.Item
                name="specialization"
                rules={[{ required: true, message: 'Пожалуйста, укажите специализацию' }]}
              >
                <Input 
                  placeholder="Специализация" 
                  size="large"
                  className="partner-form__input"
                />
              </Form.Item>

              <Form.Item name="experience">
                <Input.TextArea 
                  rows={4} 
                  placeholder="Расскажите о вашем опыте написания студенческих работ"
                  className="partner-form__textarea"
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large"
                  block
                  className="button partner-form__submit"
                >
                  Отправить заявку
                </Button>
              </Form.Item>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ExpertForm;
