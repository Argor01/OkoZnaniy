import React from 'react';
import { Form, Input, Button } from 'antd';

const PartnerForm: React.FC = () => {
  const [form] = Form.useForm();

  const onFinish = (values: any) => {
    // Здесь будет отправка данных на сервер
  };

  return (
    <section className="leave-order" id="partner-form">
      <div className="mcontainer">
        <div className="leave-order__wrapper">
          <div className="leave-order__content">
            <h2 className="leave-order__content-title">Панель отправления заявки</h2>
            <p className="leave-order__content-description">
              Заполните форму, и наш менеджер свяжется с вами по телефону для обсуждения всех деталей партнерства
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
                  style={{ borderRadius: '8px' }}
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
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="phone"
                rules={[{ required: true, message: 'Пожалуйста, введите телефон' }]}
              >
                <Input 
                  placeholder="Телефон" 
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item
                name="city"
                rules={[{ required: true, message: 'Пожалуйста, укажите город' }]}
              >
                <Input 
                  placeholder="Город" 
                  size="large"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item name="experience">
                <Input.TextArea 
                  rows={4} 
                  placeholder="Расскажите о вашем опыте в бизнесе или образовательной сфере"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item name="additionalInfo">
                <Input.TextArea 
                  rows={3} 
                  placeholder="Есть ли у вас офис? Планируете работать онлайн или офлайн?"
                  style={{ borderRadius: '8px' }}
                />
              </Form.Item>

              <Form.Item>
                <Button 
                  type="primary" 
                  htmlType="submit" 
                  size="large"
                  block
                  className="button"
                  style={{ 
                    height: '56px',
                    fontSize: '17px',
                    borderRadius: '12px'
                  }}
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
