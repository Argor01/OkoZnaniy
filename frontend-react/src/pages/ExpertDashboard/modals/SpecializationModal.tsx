import React from 'react';
import { Modal, Form, Input, InputNumber as AntInputNumber, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expertsApi, type CreateSpecializationRequest, type Specialization } from '../../../api/experts';
import SkillsSelect from '../../../components/SkillsSelect';
import styles from '../ExpertDashboard.module.css';

type SpecializationFormValues = {
  subject_id?: number;
  custom_name?: string;
  experience_years?: number;
  hourly_rate?: number;
  description?: string;
  skills?: string[] | string;
};

interface SpecializationModalProps {
  visible: boolean;
  onClose: () => void;
  editingSpecialization: Specialization | null;
}

const SpecializationModal: React.FC<SpecializationModalProps> = ({
  visible,
  onClose,
  editingSpecialization
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isMobile] = React.useState(window.innerWidth <= 768);

  const createSpecializationMutation = useMutation({
    mutationFn: (data: CreateSpecializationRequest) => expertsApi.createSpecialization(data),
    onSuccess: () => {
      message.success('Специализация добавлена');
      onClose();
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['expert-specializations'] });
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Не удалось добавить специализацию';
      message.error(detail);
    },
  });

  const updateSpecializationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<CreateSpecializationRequest> }) =>
      expertsApi.updateSpecialization(id, data),
    onSuccess: () => {
      message.success('Специализация обновлена');
      onClose();
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['expert-specializations'] });
    },
    onError: (err: unknown) => {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
        'Не удалось обновить специализацию';
      message.error(detail);
    },
  });

  React.useEffect(() => {
    if (visible && editingSpecialization) {
      const toNumberOrUndefined = (value: unknown) => {
        if (value === null || value === undefined || value === '') return undefined;
        if (typeof value === 'number') return value;
        const num = Number(value);
        return Number.isFinite(num) ? num : undefined;
      };

      const formValues: SpecializationFormValues = {
        subject_id: editingSpecialization.subject?.id,
        experience_years: toNumberOrUndefined(editingSpecialization.experience_years),
        hourly_rate: toNumberOrUndefined(editingSpecialization.hourly_rate),
        description: editingSpecialization.description,
      };
      
      
      if (editingSpecialization.skills && typeof editingSpecialization.skills === 'string') {
        formValues.skills = editingSpecialization.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      } else if (Array.isArray(editingSpecialization.skills)) {
        formValues.skills = editingSpecialization.skills;
      }
      
      form.setFieldsValue(formValues);
    } else if (visible) {
      form.resetFields();
    }
  }, [visible, editingSpecialization, form]);

  const handleClose = () => {
    onClose();
    form.resetFields();
  };

  return (
    <Modal
      title={
        <div className={`${styles.specializationModalTitle} ${isMobile ? styles.specializationModalTitleMobile : styles.specializationModalTitleDesktop}`}>
          {editingSpecialization ? 'Редактировать специализацию' : 'Добавить специализацию'}
        </div>
      }
      open={visible}
      onCancel={handleClose}
      onOk={() => form.submit()}
      width={isMobile ? '100%' : 600}
      okText={editingSpecialization ? 'Сохранить' : 'Добавить'}
      cancelText="Отмена"
      okButtonProps={{
        className: `${styles.buttonPrimary} ${styles.specializationModalButton} ${isMobile ? styles.specializationModalButtonMobile : styles.specializationModalButtonDesktop}`,
        size: isMobile ? 'middle' : 'large',
      }}
      cancelButtonProps={{
        className: `${styles.buttonSecondary} ${styles.specializationModalButton} ${isMobile ? styles.specializationModalButtonMobile : styles.specializationModalButtonDesktop}`,
        size: isMobile ? 'middle' : 'large',
      }}
      wrapClassName={`${styles.specializationModalWrap} ${isMobile ? styles.specializationModalWrapMobile : styles.specializationModalWrapDesktop}`}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values: SpecializationFormValues) => {
          const dataToSend: CreateSpecializationRequest = {
            subject_id: values.subject_id,
            custom_name: values.custom_name,
            experience_years: Number(values.experience_years),
            hourly_rate: Number(values.hourly_rate),
            description: values.description,
            skills: Array.isArray(values.skills)
              ? values.skills.join(', ')
              : typeof values.skills === 'string'
                ? values.skills
                : undefined,
          };
          
          if (editingSpecialization) {
            updateSpecializationMutation.mutate({ id: editingSpecialization.id, data: dataToSend });
          } else {
            createSpecializationMutation.mutate(dataToSend);
          }
        }}
      >
        <Form.Item
          label="Название специализации"
          name="custom_name"
          rules={[{ required: true, message: 'Введите название специализации' }]}
        >
          <Input
            size={isMobile ? 'middle' : 'large'}
            placeholder="Например: Высшая математика, Программирование на Python"
            className={styles.inputField}
            maxLength={100}
          />
        </Form.Item>
        
        <div className={`${styles.specializationModalGrid} ${isMobile ? styles.specializationModalGridMobile : styles.specializationModalGridDesktop}`}>
          <Form.Item
            label="Опыт работы (лет)"
            name="experience_years"
            rules={[
              { required: true, message: 'Укажите опыт работы' },
              { type: 'number', min: 0, max: 90, message: 'Опыт должен быть от 0 до 90 лет' }
            ]}
          >
            <AntInputNumber 
              min={0} 
              max={90}
              precision={0}
              parser={(value) => {
                if (!value) return 0;
                const parsed = value.replace(/\D/g, '');
                return parsed ? Number(parsed) : 0;
              }}
              formatter={(value) => value !== undefined && value !== null ? String(value) : ''}
              controls={false}
              className={`${styles.inputField} ${styles.specializationModalFullWidth}`}
              size={isMobile ? 'middle' : 'large'}
              placeholder="0"
              onKeyPress={(e) => {
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
            />
          </Form.Item>
          <Form.Item
            label="Часовая ставка (₽)"
            name="hourly_rate"
            rules={[
              { required: true, message: 'Укажите часовую ставку' },
              { type: 'number', min: 0, message: 'Ставка должна быть положительным числом' }
            ]}
          >
            <AntInputNumber 
              min={0}
              max={999999}
              precision={0}
              parser={(value) => {
                if (!value) return 0;
                const parsed = value.replace(/\D/g, '');
                return parsed ? Number(parsed) : 0;
              }}
              formatter={(value) => value !== undefined && value !== null ? String(value) : ''}
              controls={false}
              step={100}
              className={`${styles.inputField} ${styles.specializationModalFullWidth}`}
              size={isMobile ? 'middle' : 'large'}
              placeholder="0"
              onKeyPress={(e) => {
                if (!/[0-9]/.test(e.key)) {
                  e.preventDefault();
                }
              }}
            />
          </Form.Item>
        </div>
        <Form.Item
          label="Навыки"
          name="skills"
          extra="Начните вводить навык или выберите из списка. Можно добавить свои навыки."
        >
          <SkillsSelect
            size={isMobile ? 'middle' : 'large'}
            placeholder="Начните писать навык"
          />
        </Form.Item>
        <Form.Item
          label="Описание"
          name="description"
        >
          <Input.TextArea 
            rows={isMobile ? 3 : 4} 
            placeholder="Опишите ваш опыт в этой области"
            className={`${styles.textareaField} ${isMobile ? styles.specializationModalTextareaMobile : styles.specializationModalTextareaDesktop}`}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SpecializationModal;
