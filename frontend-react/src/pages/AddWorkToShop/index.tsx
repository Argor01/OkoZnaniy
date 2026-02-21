import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, message } from 'antd';
import WorkForm from './components/WorkForm';
import { WorkFormData } from './types';
import { shopApi } from '../../api/shop';
import styles from './AddWorkToShop.module.css';

const { Title } = Typography;

const AddWorkToShop: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  
  const createWorkMutation = useMutation({
    mutationFn: (data: any) => shopApi.createWork(data),
    onSuccess: () => {
      message.success('Работа успешно добавлена!');
      queryClient.invalidateQueries({ queryKey: ['shop-works'] });
      navigate('/shop/ready-works');
    },
    onError: () => {
      message.error('Ошибка при добавлении работы');
    },
  });

  const handleSubmit = (formData: WorkFormData) => {
    
    const apiData = {
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
      <Title level={2} style={{ margin: 0, marginBottom: 24 }}>
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