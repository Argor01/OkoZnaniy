import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, message } from 'antd';
import { AxiosError } from 'axios';
import WorkForm from './components/WorkForm';
import { WorkFormData, CreateWorkPayload } from '@/features/shop/types';
import { shopApi } from '@/features/shop/api/shop';
import styles from './AddWorkToShop.module.css';

const formatBackendError = (error: unknown): string => {
  const fallback = 'Ошибка при добавлении работы';
  const axiosError = error as AxiosError<unknown> | undefined;
  const data = axiosError?.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data || fallback;
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.detail === 'string') return obj.detail;
    const fieldMessages: string[] = [];
    for (const [field, val] of Object.entries(obj)) {
      const text = Array.isArray(val) ? val.join(' ') : String(val ?? '');
      if (text) fieldMessages.push(`${field}: ${text}`);
    }
    if (fieldMessages.length) return fieldMessages.join('\n');
  }
  return fallback;
};

const { Title } = Typography;

const AddWorkToShop: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  
  const createWorkMutation = useMutation({
    mutationFn: (data: CreateWorkPayload) => shopApi.createWork(data),
    onSuccess: () => {
      message.success('Работа успешно добавлена!');
      queryClient.invalidateQueries({ queryKey: ['shop-works'] });
      navigate('/shop/ready-works');
    },
    onError: (error: unknown) => {
      message.error(formatBackendError(error));
    },
  });

  const handleSubmit = (formData: WorkFormData) => {
    
    const apiData: CreateWorkPayload = {
      title: formData.title,
      description: formData.description,
      price: formData.price,
      subject: formData.subject,
      work_type: formData.workType,
      preview: formData.preview,
      files: formData.files
    };
    
    createWorkMutation.mutate(apiData);
  };

  const handleCancel = () => {
    navigate('/shop/ready-works');
  };

  return (
    <div className={styles.container}>
      <Title level={2} className={styles.pageTitle}>
        Добавить работу в магазин
      </Title>
      
      <WorkForm
        onSave={handleSubmit}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default AddWorkToShop;
