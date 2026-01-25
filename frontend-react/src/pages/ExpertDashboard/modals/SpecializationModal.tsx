import React from 'react';
import { Modal, Form, Input, InputNumber as AntInputNumber, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expertsApi } from '../../../api/experts';
import SkillsSelect from '../../../components/SkillsSelect';
import styles from '../ExpertDashboard.module.css';

interface SpecializationModalProps {
  visible: boolean;
  onClose: () => void;
  editingSpecialization: any;
  subjects: any[];
}

const SpecializationModal: React.FC<SpecializationModalProps> = ({
  visible,
  onClose,
  editingSpecialization,
  subjects
}) => {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();
  const [isMobile] = React.useState(window.innerWidth <= 768);

  const createSpecializationMutation = useMutation({
    mutationFn: (data: any) => expertsApi.createSpecialization(data),
    onSuccess: () => {
      message.success('Специализация добавлена');
      onClose();
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['expert-specializations'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Не удалось добавить специализацию');
    },
  });

  const updateSpecializationMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => expertsApi.updateSpecialization(id, data),
    onSuccess: () => {
      message.success('Специализация обновлена');
      onClose();
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ['expert-specializations'] });
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.detail || 'Не удалось обновить специализацию');
    },
  });

  React.useEffect(() => {
    if (visible && editingSpecialization) {
      const toNumberOrUndefined = (value: any) => {
        if (value === null || value === undefined || value === '') return undefined;
        if (typeof value === 'number') return value;
        const num = Number(value);
        return Number.isFinite(num) ? num : undefined;
      };

      const formValues: any = {
        subject_id: editingSpecialization.subject?.id,
        experience_years: toNumberOrUndefined(editingSpecialization.experience_years),
        hourly_rate: toNumberOrUndefined(editingSpecialization.hourly_rate),
        description: editingSpecialization.description,
      };
      
      // Преобразуем строку навыков в массив
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
        <div style={{ 
          fontSize: isMobile ? 18 : 24, 
          fontWeight: 600,
          color: '#1f2937'
        }}>
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
        className: styles.buttonPrimary,
        size: isMobile ? 'middle' : 'large',
        style: { 
          borderRadius: isMobile ? 8 : 12,
          height: isMobile ? 40 : 44,
          fontSize: isMobile ? 14 : 16,
          fontWeight: 500
        }
      }}
      cancelButtonProps={{
        className: styles.buttonSecondary,
        size: isMobile ? 'middle' : 'large',
        style: { 
          borderRadius: isMobile ? 8 : 12,
          height: isMobile ? 40 : 44,
          fontSize: isMobile ? 14 : 16,
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
          borderRadius: isMobile ? 16 : 24, 
          padding: 0,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          margin: isMobile ? '16px' : 'auto',
          maxWidth: isMobile ? 'calc(100% - 32px)' : '600px'
        },
        header: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: isMobile ? '16px 20px' : '24px 32px',
          borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: isMobile ? '16px 16px 0 0' : '24px 24px 0 0'
        },
        body: {
          padding: isMobile ? '20px' : '32px',
          background: 'rgba(255, 255, 255, 0.95)',
          maxHeight: isMobile ? 'calc(100vh - 200px)' : 'auto',
          overflowY: isMobile ? 'auto' : 'visible'
        },
        footer: {
          padding: isMobile ? '16px 20px' : '24px 32px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderTop: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: isMobile ? '0 0 16px 16px' : '0 0 24px 24px'
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          // Преобразуем массив навыков в строку для отправки на сервер
          const dataToSend = { ...values };
          if (Array.isArray(values.skills)) {
            dataToSend.skills = values.skills.join(', ');
          }
          
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
        
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
          gap: isMobile ? 12 : 16 
        }}>
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
              style={{ width: '100%' }}
              className={styles.inputField}
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
              style={{ width: '100%' }}
              className={styles.inputField}
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
            className={styles.textareaField}
            style={{ fontSize: isMobile ? 14 : 15 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SpecializationModal;
