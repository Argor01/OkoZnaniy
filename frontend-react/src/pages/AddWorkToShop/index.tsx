import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Typography, message } from 'antd';
import WorkForm from './components/WorkForm';
import { authApi } from '../../api/auth';
import { catalogApi } from '../../api/catalog';
import { WorkFormData } from './types';
import { shopApi } from '../../api/shop';
import styles from './AddWorkToShop.module.css';

const { Title } = Typography;

const AddWorkToShop: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Загрузка профиля пользователя
  const { data: profile } = useQuery({
    queryKey: ['user-profile'],
    queryFn: () => authApi.getCurrentUser(),
  });

  // Загрузка справочников
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => catalogApi.getSubjects(),
  });

  const { data: workTypes = [] } = useQuery({
    queryKey: ['workTypes'],
    queryFn: () => catalogApi.getWorkTypes(),
  });

  // Мутация для создания работы
  const createWorkMutation = useMutation({
    mutationFn: (data: WorkFormData) => shopApi.createWork(data),
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
    // Преобразуем данные для API
    const apiData = {
      ...formData,
      work_type: formData.workType
    };
    delete (apiData as any).workType;
    
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
        subjects={subjects}
        workTypes={workTypes}
      />
    </div>
  );
};

export default AddWorkToShop;