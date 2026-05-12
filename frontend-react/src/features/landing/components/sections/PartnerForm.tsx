import React from 'react';
import { Form, Input, Button } from 'antd';
import landingStyles from '@/features/landing/Landing.module.css';
import styles from './PartnerForm.module.css';

const PartnerForm: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    
  };

  return (
    <section className={styles.leaveOrder} id="partner-form">
      <div className={landingStyles.mcontainer}>
        <div className={styles.leaveOrderWrapper}>
          <div className={styles.leaveOrderContent}>
            <h2 className={styles.leaveOrderContentTitle}>Панель отправления заявки</h2>
            <p className={styles.leaveOrderContentDescription}>
              Заполните форму, и наш менеджер свяжется с вами по телефону для обсуждения всех деталей партнерства
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
                name="city"
                rules={[{ required: true, message: 'Пожалуйста, укажите город' }]}
              >
                <Input 
                  placeholder="Город" 
                  size="large"
                  className={styles.partnerFormInput}
                />
              </Form.Item>

              <Form.Item name="experience">
                <Input.TextArea 
                  rows={4} 
                  placeholder="Расскажите о вашем опыте в бизнесе или образовательной сфере"
                  className={styles.partnerFormTextarea}
                />
              </Form.Item>

              <Form.Item name="additionalInfo">
                <Input.TextArea 
                  rows={3} 
                  placeholder="Есть ли у вас офис? Планируете работать онлайн или офлайн?"
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

export default PartnerForm;
