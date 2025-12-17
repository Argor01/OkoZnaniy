import React from 'react';
import { Modal, Form, Input, Button, Row, Col, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expertsApi, type Education } from '../../../api/experts';
import SpecializationsSelect from '../../../components/SpecializationsSelect';
import styles from '../ExpertDashboard.module.css';

interface ApplicationModalProps {
  visible: boolean;
  onClose: () => void;
}

const ApplicationModal: React.FC<ApplicationModalProps> = ({ 
  visible, 
  onClose
}) => {
  const [applicationForm] = Form.useForm();
  const queryClient = useQueryClient();

  const createApplicationMutation = useMutation({
    mutationFn: expertsApi.createApplication,
    onSuccess: () => {
      message.success('Анкета успешно отправлена!');
      applicationForm.resetFields();
      onClose();
      queryClient.invalidateQueries({ queryKey: ['expertProfile'] });
    },
    onError: (error: any) => {
      console.error('Error creating application:', error);
      const errorMessage = error?.response?.data?.detail || 
                          error?.response?.data?.message || 
                          'Ошибка при отправке анкеты';
      message.error(errorMessage);
    }
  });

  return (
    <Modal
      style={window.innerWidth <= 480 ? { top: 0, margin: 0, padding: 0, maxWidth: '100%', height: '100%' } : { top: 20 }}
      title={
        <div style={{ 
          fontSize: 24, 
          fontWeight: 600, 
          color: '#1890ff',
        }}>
          Заполнение анкеты эксперта
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={() => applicationForm.submit()}
      width={window.innerWidth <= 480 ? '100%' : 750}
      okText="Отправить"
      cancelText="Отмена"
      okButtonProps={{
        className: styles.buttonPrimary,
        size: 'large',
        style: { 
          borderRadius: 12,
          height: 44,
          fontSize: 16,
          fontWeight: 500
        }
      }}
      cancelButtonProps={{
        className: styles.buttonSecondary,
        size: 'large',
        style: { 
          borderRadius: 12,
          height: 44,
          fontSize: 16,
          fontWeight: 500
        }
      }}
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        content: { 
          borderRadius: window.innerWidth <= 480 ? 0 : 24, 
          padding: 0,
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          height: window.innerWidth <= 480 ? '100%' : 'auto',
          display: 'flex',
          flexDirection: 'column'
        },
        header: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: window.innerWidth <= 480 ? '16px' : '24px 32px',
          borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: window.innerWidth <= 480 ? 0 : '24px 24px 0 0'
        },
        body: {
          padding: window.innerWidth <= 480 ? '20px 24px' : '32px',
          background: 'rgba(255, 255, 255, 0.95)',
          flex: 1,
          overflowY: 'auto'
        },
        footer: {
          padding: window.innerWidth <= 480 ? '16px' : '24px 32px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderTop: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: window.innerWidth <= 480 ? 0 : '0 0 24px 24px'
        }
      }}
    >
      <div style={{
        padding: 0
      }}>
      <Form
        form={applicationForm}
        layout="vertical"
        initialValues={{ educations: [{}] }}
        onFinish={(values) => {
          // Filter out empty education entries
          const educations = values.educations?.filter((edu: Education) => 
            edu.university && edu.start_year
          ) || [];
          
          if (educations.length === 0) {
            message.error('Добавьте хотя бы одно образование');
            return;
          }
          
          // Формируем full_name из отдельных полей
          const full_name = [values.last_name, values.first_name, values.middle_name]
            .filter(Boolean)
            .join(' ');
          
          // Преобразуем массив специализаций в строку
          const specializations = Array.isArray(values.specializations)
            ? values.specializations.join(', ')
            : values.specializations;
          
          // Отправляем только нужные поля
          createApplicationMutation.mutate({
            full_name,
            work_experience_years: values.work_experience_years,
            specializations,
            educations
          });
        }}
      >
        <Form.Item
          label="Фамилия"
          name="last_name"
          rules={[{ required: true, message: 'Введите фамилию' }]}
        >
          <Input 
            placeholder="Иванов" 
            className={styles.inputField}
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="Имя"
          name="first_name"
          rules={[{ required: true, message: 'Введите имя' }]}
        >
          <Input 
            placeholder="Иван" 
            className={styles.inputField}
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="Отчество"
          name="middle_name"
        >
          <Input 
            placeholder="Иванович" 
            className={styles.inputField}
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="Опыт работы (лет)"
          name="work_experience_years"
          rules={[
            { required: true, message: 'Укажите опыт работы' },
            { 
              pattern: /^[0-9]+$/, 
              message: 'Введите только цифры' 
            },
            {
              validator: (_, value) => {
                if (!value) return Promise.resolve();
                const num = parseInt(value, 10);
                if (num < 0) return Promise.reject(new Error('Опыт не может быть отрицательным'));
                if (num > 90) return Promise.reject(new Error('Максимальный опыт - 90 лет'));
                return Promise.resolve();
              }
            }
          ]}
          extra="Укажите общий опыт работы в годах (от 0 до 90)"
        >
          <Input 
            placeholder="Например: 5"
            className={`${styles.inputField} ${styles.experienceField}`}
            size="large"
            maxLength={2}
            onKeyPress={(e) => {
              if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
                e.preventDefault();
              }
            }}
            onChange={(e) => {
              const value = e.target.value;
              // Удаляем все нецифровые символы
              const numericValue = value.replace(/[^0-9]/g, '');
              if (numericValue !== value) {
                e.target.value = numericValue;
              }
            }}
          />
        </Form.Item>

        <Form.Item
          label="Специальности"
          name="specializations"
          rules={[{ required: true, message: 'Выберите специальности' }]}
          extra="Выберите из списка или введите свои специальности"
        >
          <SpecializationsSelect placeholder="Например: Математика, Физика, Информатика" />
        </Form.Item>

        <Form.Item label="Образование">
          <Form.List name="educations">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...restField }) => (
                  <div key={key} className={styles.modalEducationRow}>
                    {/* Название ВУЗа - отдельная строка */}
                    <Row gutter={16}>
                      <Col span={22}>
                        <Form.Item
                          {...restField}
                          name={[name, 'university']}
                          rules={[{ required: true, message: 'Введите ВУЗ' }]}
                          style={{ marginBottom: 12 }}
                        >
                          <Input 
                            placeholder="Название ВУЗа" 
                            className={styles.inputField}
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={2} style={{ textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                          style={{ marginTop: 0 }}
                        />
                      </Col>
                    </Row>
                    
                    {/* Годы - в одной строке */}
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'start_year']}
                          rules={[{ required: true, message: 'Год начала' }]}
                          style={{ marginBottom: 12 }}
                        >
                          <Input 
                            type="number"
                            min={1950} 
                            max={2100} 
                            placeholder="Год начала" 
                            className={styles.inputField}
                            size="large"
                            onKeyPress={(e) => {
                              if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value && (parseInt(value) < 1950 || parseInt(value) > 2100)) {
                                e.target.value = Math.max(1950, Math.min(2100, parseInt(value) || 1950)).toString();
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'end_year']}
                          style={{ marginBottom: 12 }}
                        >
                          <Input 
                            type="number"
                            min={1950} 
                            max={2100} 
                            placeholder="Год окончания" 
                            className={styles.inputField}
                            size="large"
                            onKeyPress={(e) => {
                              if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') {
                                e.preventDefault();
                              }
                            }}
                            onChange={(e) => {
                              const value = e.target.value;
                              if (value && (parseInt(value) < 1950 || parseInt(value) > 2100)) {
                                e.target.value = Math.max(1950, Math.min(2100, parseInt(value) || 1950)).toString();
                              }
                            }}
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                    
                    {/* Степень - отдельная строка */}
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          {...restField}
                          name={[name, 'degree']}
                          style={{ marginBottom: 0 }}
                        >
                          <Input 
                            placeholder="Степень" 
                            className={styles.inputField}
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ))}
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                    size="large"
                    style={{
                      borderRadius: 12,
                      height: 48,
                      fontSize: 15,
                      fontWeight: 500,
                      borderColor: 'rgba(102, 126, 234, 0.3)',
                      color: '#667eea'
                    }}
                  >
                    Добавить образование
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form.Item>
      </Form>
      </div>
    </Modal>
  );
};

export default ApplicationModal;
