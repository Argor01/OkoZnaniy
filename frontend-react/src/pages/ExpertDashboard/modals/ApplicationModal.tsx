import React, { useState, useEffect } from 'react';
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 575);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 575);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  
  useEffect(() => {
    if (visible && isMobile) {
      document.body.style.overflow = 'hidden';
      
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [visible, isMobile]);

  const createApplicationMutation = useMutation({
    mutationFn: expertsApi.createApplication,
    onSuccess: () => {
      message.success('Анкета успешно отправлена!');
      applicationForm.resetFields();
      onClose();
      queryClient.invalidateQueries({ queryKey: ['expertProfile'] });
    },
    onError: (error: unknown) => {
      const errorMessage =
        (error as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.detail ||
        (error as { response?: { data?: { detail?: string; message?: string } } })?.response?.data?.message ||
        'Ошибка при отправке анкеты';
      message.error(errorMessage);
    }
  });

  return (
    <Modal
      title={
        <div className={styles.applicationModalTitle}>
          Заполнение анкеты эксперта
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={() => applicationForm.submit()}
      width={isMobile ? '100%' : 750}
      okText="Отправить"
      cancelText="Отмена"
      okButtonProps={{
        className: `${styles.buttonPrimary} ${styles.applicationModalButton}`,
        size: 'large',
      }}
      cancelButtonProps={{
        className: `${styles.buttonSecondary} ${styles.applicationModalButton}`,
        size: 'large',
      }}
      wrapClassName={`${styles.applicationModalWrap} ${isMobile ? styles.applicationModalWrapMobile : styles.applicationModalWrapDesktop}`}
    >
      <Form
        form={applicationForm}
        layout="vertical"
        initialValues={{ educations: [{}] }}
        onFinish={(values) => {
          
          const educations = values.educations?.filter((edu: Education) => 
            edu.university && edu.start_year
          ) || [];
          
          if (educations.length === 0) {
            message.error('Добавьте хотя бы одно образование');
            return;
          }
          
          
          const full_name = [values.last_name, values.first_name, values.middle_name]
            .filter(Boolean)
            .join(' ');
          
          
          const specializations = Array.isArray(values.specializations)
            ? values.specializations.join(', ')
            : values.specializations;
          
          
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
                    
                    <Row gutter={16}>
                      <Col span={22}>
                        <Form.Item
                          {...restField}
                          name={[name, 'university']}
                          rules={[{ required: true, message: 'Введите ВУЗ' }]}
                          className={styles.applicationModalItemSpacing}
                        >
                          <Input 
                            placeholder="Название ВУЗа" 
                            className={styles.inputField}
                            size="large"
                          />
                        </Form.Item>
                      </Col>
                      <Col span={2} className={styles.applicationModalDeleteCol}>
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={() => remove(name)}
                          className={styles.applicationModalDeleteButton}
                        />
                      </Col>
                    </Row>
                    
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item
                          {...restField}
                          name={[name, 'start_year']}
                          rules={[{ required: true, message: 'Год начала' }]}
                          className={styles.applicationModalItemSpacing}
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
                          className={styles.applicationModalItemSpacing}
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
                    
                    
                    <Row gutter={16}>
                      <Col span={24}>
                        <Form.Item
                          {...restField}
                          name={[name, 'degree']}
                          className={styles.applicationModalItemTight}
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
                <Form.Item className={styles.applicationModalItemTight}>
                  <Button
                    type="dashed"
                    onClick={() => add()}
                    block
                    icon={<PlusOutlined />}
                    size="large"
                    className={styles.applicationModalAddButton}
                  >
                    Добавить образование
                  </Button>
                </Form.Item>
              </>
            )}
          </Form.List>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default ApplicationModal;
