import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, Row, Col, message } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expertsApi, type Education, type ExpertApplication } from '@/features/expert/api/experts';
import { useAuth } from '@/features/auth/hooks/useAuth';
import SkillsSelect from '../components/inputs/SkillsSelect';
import styles from './ApplicationModal.module.css';

interface ApplicationModalProps {
  visible: boolean;
  onClose: () => void;
  application?: ExpertApplication | null;
}

const formatPhoneRu = (rawValue: string): string => {
  const digitsOnly = rawValue.replace(/\D/g, '');
  if (!digitsOnly) return '';

  let normalized = digitsOnly;
  if (normalized.startsWith('8')) {
    normalized = `7${normalized.slice(1)}`;
  } else if (!normalized.startsWith('7')) {
    normalized = `7${normalized}`;
  }

  const limited = normalized.slice(0, 11);
  const local = limited.slice(1);

  let formatted = '+7';
  if (local.length > 0) {
    formatted += ` (${local.slice(0, 3)}`;
  }
  if (local.length >= 3) {
    formatted += ')';
  }
  if (local.length > 3) {
    formatted += ` ${local.slice(3, 6)}`;
  }
  if (local.length > 6) {
    formatted += `-${local.slice(6, 8)}`;
  }
  if (local.length > 8) {
    formatted += `-${local.slice(8, 10)}`;
  }

  return formatted;
};

const getCaretPositionByDigitsCount = (formattedValue: string, digitsCount: number): number => {
  if (digitsCount <= 0) return 0;

  let seenDigits = 0;
  for (let i = 0; i < formattedValue.length; i += 1) {
    if (/\d/.test(formattedValue[i])) {
      seenDigits += 1;
      if (seenDigits === digitsCount) {
        return i + 1;
      }
    }
  }

  return formattedValue.length;
};

const extractApiErrorMessage = (
  error: unknown,
  fallback: string
): string => {
  const responseData = (error as { response?: { data?: unknown } })?.response?.data as
    | { detail?: string; message?: string; non_field_errors?: string[]; [key: string]: unknown }
    | undefined;

  if (!responseData) return fallback;
  if (responseData.detail && typeof responseData.detail === 'string') return responseData.detail;
  if (responseData.message && typeof responseData.message === 'string') return responseData.message;
  if (Array.isArray(responseData.non_field_errors) && responseData.non_field_errors[0]) {
    return String(responseData.non_field_errors[0]);
  }

  for (const [field, value] of Object.entries(responseData)) {
    if (field === 'detail' || field === 'message' || field === 'non_field_errors') continue;
    if (Array.isArray(value) && value[0]) {
      return `${field}: ${String(value[0])}`;
    }
    if (typeof value === 'string' && value) {
      return `${field}: ${value}`;
    }
  }

  return fallback;
};

const ApplicationModal: React.FC<ApplicationModalProps> = ({ 
  visible, 
  onClose,
  application
}) => {
  const { user } = useAuth();
  const [applicationForm] = Form.useForm();
  const queryClient = useQueryClient();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 575);
  const [successModalVisible, setSuccessModalVisible] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 575);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  


  useEffect(() => {
    if (visible && user) {
      if (application && (application.status === 'needs_revision' || application.status === 'rejected')) {
        const nameParts = application.full_name ? application.full_name.split(' ') : [];
        const lastName = nameParts[0] || user.last_name;
        const firstName = nameParts[1] || user.first_name;
        const middleName = nameParts.slice(2).join(' ') || '';

        let specs: number[] = [];
        if (Array.isArray(application.specializations)) {
          // Если это массив объектов с id
          specs = application.specializations.map((s: any) => 
            typeof s === 'object' && s.id ? s.id : s
          ).filter((id: any) => typeof id === 'number');
        }

        applicationForm.setFieldsValue({
          first_name: firstName,
          last_name: lastName,
          middle_name: middleName,
          email: user.email,
          phone: formatPhoneRu(application.phone || user.phone || ''),
          biography: application.biography || user.bio || '',
          portfolio_url: application.portfolio_url || user.portfolio_url || '',
          work_experience_years: application.work_experience_years,
          specializations: specs,
          educations: application.educations && application.educations.length > 0 ? application.educations : [{}],
        });
      } else {
        applicationForm.setFieldsValue({
          first_name: user.first_name,
          last_name: user.last_name,
          email: user.email,
          phone: formatPhoneRu(user.phone || ''),
          biography: user.bio || '',
          portfolio_url: user.portfolio_url || '',
          educations: [{}]
        });
      }
    }
  }, [visible, user, application, applicationForm]);

  const updateApplicationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => expertsApi.updateApplication(id, data),
    onSuccess: () => {
      message.success('Анкета успешно обновлена!');
      applicationForm.resetFields();
      onClose();
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['expert-application'] });
    },
    onError: (error: unknown) => {
      const errorMessage = extractApiErrorMessage(error, 'Ошибка при обновлении анкеты');
      message.error(errorMessage);
    }
  });

  const createApplicationMutation = useMutation({
    mutationFn: expertsApi.createApplication,
    onSuccess: () => {
      message.success({
        content: 'Анкета успешно подана и находится на рассмотрении! Мы уведомим вас о результате.',
        duration: 5,
      });
      applicationForm.resetFields();
      onClose();
      queryClient.invalidateQueries({ queryKey: ['user-profile'] });
      queryClient.invalidateQueries({ queryKey: ['expert-application'] });
    },
    onError: (error: unknown) => {
      const errorMessage = extractApiErrorMessage(error, 'Ошибка при отправке анкеты');
      message.error(errorMessage);
    }
  });

  return (
    <Modal
      title={
        <div className={styles.applicationModalTitle}>
          {application ? 'Редактирование анкеты' : 'Заполнение анкеты эксперта'}
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={() => applicationForm.submit()}
      width={isMobile ? '100%' : 750}
      style={{ top: 20 }}
      okText={application ? 'Сохранить' : 'Отправить'}
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
          
          const educations = (values.educations || [])
            .filter((edu: Education) => edu.university && edu.start_year)
            .map((edu: Education) => {
              const rawEndYear = (edu as unknown as Record<string, unknown>)['end_year'];
              return {
                university: String(edu.university || '').trim(),
                start_year: Number(edu.start_year),
                end_year: rawEndYear === '' || rawEndYear === undefined || rawEndYear === null
                  ? null
                  : Number(rawEndYear),
                degree: edu.degree ? String(edu.degree).trim() : '',
              };
            });
          
          if (educations.length === 0) {
            message.error('Добавьте хотя бы одно образование');
            return;
          }
          
          
          const full_name = [values.last_name, values.first_name, values.middle_name]
            .filter(Boolean)
            .join(' ');
          
          // Отправляем массив ID специальностей
          const specialization_ids = Array.isArray(values.specializations)
            ? values.specializations
            : [];
          
          if (application && application.id) {
            updateApplicationMutation.mutate({
              id: application.id,
              data: {
                full_name,
                work_experience_years: values.work_experience_years,
                phone: values.phone,
                biography: values.biography,
                portfolio_url: values.portfolio_url,
                specialization_ids,
                educations,
                email: values.email
              }
            });
          } else {
            createApplicationMutation.mutate({
              full_name,
              work_experience_years: values.work_experience_years,
              phone: values.phone,
              biography: values.biography,
              portfolio_url: values.portfolio_url,
              specialization_ids,
              educations,
              email: values.email
            });
          }
        }}
      >
        <Form.Item name="email" hidden>
          <Input />
        </Form.Item>

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
          label="Телефон"
          name="phone"
          normalize={(value) => formatPhoneRu(String(value || ''))}
          rules={[{ required: true, message: 'Введите телефон' }]}
        >
          <Input
            placeholder="+7 (999) 123-45-67"
            className={styles.inputField}
            size="large"
            maxLength={18}
            onKeyDown={(e) => {
              const input = e.currentTarget;
              const value = input.value;
              const selectionStart = input.selectionStart ?? value.length;
              const selectionEnd = input.selectionEnd ?? value.length;

              if (selectionStart !== selectionEnd) return;

              if (e.key === 'Backspace') {
                if (selectionStart === 0) return;

                const charBeforeCaret = value[selectionStart - 1];
                if (/\d/.test(charBeforeCaret)) return;

                const digits = value.replace(/\D/g, '');
                const digitsBeforeCaret = value.slice(0, selectionStart).replace(/\D/g, '').length;
                const removeIndex = digitsBeforeCaret - 1;
                if (removeIndex < 0 || removeIndex >= digits.length) return;

                e.preventDefault();
                const nextDigits = `${digits.slice(0, removeIndex)}${digits.slice(removeIndex + 1)}`;
                const nextFormatted = formatPhoneRu(nextDigits);
                const nextCaretPos = getCaretPositionByDigitsCount(nextFormatted, removeIndex);
                applicationForm.setFieldsValue({ phone: nextFormatted });
                requestAnimationFrame(() => input.setSelectionRange(nextCaretPos, nextCaretPos));
                return;
              }

              if (e.key === 'Delete') {
                const charAtCaret = value[selectionStart];
                if (!charAtCaret || /\d/.test(charAtCaret)) return;

                const digits = value.replace(/\D/g, '');
                const digitsBeforeCaret = value.slice(0, selectionStart).replace(/\D/g, '').length;
                const removeIndex = digitsBeforeCaret;
                if (removeIndex < 0 || removeIndex >= digits.length) return;

                e.preventDefault();
                const nextDigits = `${digits.slice(0, removeIndex)}${digits.slice(removeIndex + 1)}`;
                const nextFormatted = formatPhoneRu(nextDigits);
                const nextCaretPos = getCaretPositionByDigitsCount(nextFormatted, digitsBeforeCaret);
                applicationForm.setFieldsValue({ phone: nextFormatted });
                requestAnimationFrame(() => input.setSelectionRange(nextCaretPos, nextCaretPos));
              }
            }}
          />
        </Form.Item>

        <Form.Item
          label="Дополнительно"
          name="biography"
        >
          <Input.TextArea
            placeholder="Расскажите немного о себе"
            className={styles.inputField}
            autoSize={{ minRows: 4, maxRows: 8 }}
          />
        </Form.Item>

        <Form.Item
          label="Портфолио (ссылка)"
          name="portfolio_url"
          rules={[{ type: 'url', message: 'Введите корректную ссылку' }]}
        >
          <Input
            placeholder="https://example.com/portfolio"
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
          rules={[
            { required: true, message: 'Выберите хотя бы одну специальность' },
            {
              validator: (_, value) => {
                if (!value || value.length === 0) {
                  return Promise.reject(new Error('Выберите хотя бы одну специальность'));
                }
                return Promise.resolve();
              }
            }
          ]}
          extra="Выберите предметы, по которым вы можете выполнять работы"
        >
          <SkillsSelect
            placeholder="Например: Математика, Физика, Информатика"
            allowCreateSubject
          />
        </Form.Item>

        <Form.Item label="Образование" required tooltip="Добавьте минимум одно образование">
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
