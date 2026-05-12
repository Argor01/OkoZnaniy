import React from 'react';
import { Form, Input, Button } from 'antd';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './ExpertForm.module.css';

const ExpertForm: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    
  };

  return (
    <section className={styles.leaveOrder} id="expert-form">
      <div className={landingStyles.mcontainer}>
        <div className={styles.leaveOrderWrapper}>
          <div className={styles.leaveOrderContent}>
            <h2 className={styles.leaveOrderContentTitle}>Панель отправления заявки</h2>
            <p className={styles.leaveOrderContentDescription}>
              Заполните форму, и мы свяжемся с вами в ближайшее время для обсуждения условий сотрудничества
            </p>
          </div>

          <div className={styles.leaveOrderForm}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onFinish}
              className={styles.leaveOrderFormWrapper}
            >
              <Form.Item
                name="fullName"
                rules={[{ required: true, message: 'Пожалуйста, введите ваше ФИО' }]}
              >
                <Input 
                  placeholder="ФИО" 
                  size="large"
                  className={styles.partnerFormInput}
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
                  className={styles.partnerFormInput}
                />
              </Form.Item>

              <Form.Item
                name="phone"
                rules={[{ required: true, message: 'Пожалуйста, введите телефон' }]}
              >
                <Input 
                  placeholder="Телефон" 
                  size="large"
                  className={styles.partnerFormInput}
                />
              </Form.Item>

              <Form.Item
                name="university"
                rules={[{ required: true, message: 'Пожалуйста, укажите университет' }]}
              >
                <Input 
                  placeholder="Университет" 
                  size="large"
                  className={styles.partnerFormInput}
                />
              </Form.Item>

              <Form.Item
                name="specialization"
                rules={[{ required: true, message: 'Пожалуйста, укажите специализацию' }]}
              >
                <Input 
                  placeholder="Специализация" 
                  size="large"
                  className={styles.partnerFormInput}
                />
              </Form.Item>

              <Form.Item name="experience">
                <Input.TextArea 
                  rows={4} 
                  placeholder="Расскажите о вашем опыте написания студенческих работ"
                  className={styles.partnerFormTextarea}
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large"
                  block
                  className={`${landingStyles.button} ${styles.partnerFormSubmit}`}
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
