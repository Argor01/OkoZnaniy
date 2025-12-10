import React from 'react';
import { Modal, Form, Input, InputNumber as AntInputNumber, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { expertsApi } from '../../../api/experts';
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
      form.setFieldsValue({
        subject_id: editingSpecialization.subject.id,
        experience_years: editingSpecialization.experience_years,
        hourly_rate: editingSpecialization.hourly_rate,
        description: editingSpecialization.description,
      });
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
          fontSize: 24, 
          fontWeight: 600,
          color: '#1f2937'
        }}>
          {editingSpecialization ? 'Редактировать специализацию' : 'Добавить специализацию'}
        </div>
      }
      open={visible}
      onCancel={handleClose}
      onOk={() => form.submit()}
      width={600}
      okText={editingSpecialization ? 'Сохранить' : 'Добавить'}
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
          borderRadius: 24, 
          padding: 0,
          overflow: 'hidden',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)'
        },
        header: {
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          padding: '24px 32px',
          borderBottom: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: '24px 24px 0 0'
        },
        body: {
          padding: '32px',
          background: 'rgba(255, 255, 255, 0.95)'
        },
        footer: {
          padding: '24px 32px',
          background: 'rgba(255, 255, 255, 0.95)',
          borderTop: '1px solid rgba(102, 126, 234, 0.1)',
          borderRadius: '0 0 24px 24px'
        }
      }}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={(values) => {
          if (editingSpecialization) {
            updateSpecializationMutation.mutate({ id: editingSpecialization.id, data: values });
          } else {
            createSpecializationMutation.mutate(values);
          }
        }}
      >
        <Form.Item
          label="Опыт работы (лет)"
          name="experience_years"
          rules={[{ required: true, message: 'Укажите опыт работы' }]}
        >
          <AntInputNumber 
            min={0} 
            max={90}
            precision={0}
            parser={(value) => {
              const parsed = value?.replace(/\D/g, '');
              return parsed ? Number(parsed) : 0;
            }}
            style={{ width: '100%' }}
            className={styles.inputField}
            size="large"
            placeholder="0"
          />
        </Form.Item>
        <Form.Item
          label="Часовая ставка (₽)"
          name="hourly_rate"
          rules={[{ required: true, message: 'Укажите часовую ставку' }]}
        >
          <AntInputNumber 
            min={0}
            precision={0}
            parser={(value) => {
              const parsed = value?.replace(/\D/g, '');
              return parsed ? Number(parsed) : 0;
            }} 
            step={100}
            style={{ width: '100%' }}
            className={styles.inputField}
            size="large"
            placeholder="0"
          />
        </Form.Item>
        <Form.Item
          label="Описание"
          name="description"
        >
          <Input.TextArea 
            rows={4} 
            placeholder="Опишите ваш опыт в этой области"
            className={styles.textareaField}
            style={{ fontSize: 15 }}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default SpecializationModal;
