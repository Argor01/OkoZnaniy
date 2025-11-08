import React, { useState } from 'react';
import {
  Table,
  Card,
  Button,
  Modal,
  Form,
  Input,
  Tag,
  Space,
  message,
  Typography,
  Descriptions,
  Spin,
  Tooltip,
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import {
  getExpertApplications,
  approveApplication,
  rejectApplication,
  sendForRework,
  type ExpertApplication,
} from '../../api/directorApi';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ExpertApplications: React.FC = () => {
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [reworkModalVisible, setReworkModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ExpertApplication | null>(null);
  const [rejectForm] = Form.useForm();
  const [reworkForm] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: applications, isLoading } = useQuery({
    queryKey: ['director-expert-applications'],
    queryFn: getExpertApplications,
  });

  const approveMutation = useMutation({
    mutationFn: (id: number) => approveApplication(id),
    onSuccess: () => {
      message.success('Анкета утверждена');
      setDetailModalVisible(false);
      queryClient.invalidateQueries({ queryKey: ['director-expert-applications'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Ошибка при утверждении анкеты';
      message.error(errorMessage);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => rejectApplication(id, reason),
    onSuccess: () => {
      message.success('Анкета отклонена');
      setRejectModalVisible(false);
      setDetailModalVisible(false);
      rejectForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['director-expert-applications'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Ошибка при отклонении анкеты';
      message.error(errorMessage);
    },
  });

  const reworkMutation = useMutation({
    mutationFn: ({ id, comment }: { id: number; comment: string }) => sendForRework(id, comment),
    onSuccess: () => {
      message.success('Анкета отправлена на доработку');
      setReworkModalVisible(false);
      setDetailModalVisible(false);
      reworkForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['director-expert-applications'] });
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || 'Ошибка при отправке на доработку';
      message.error(errorMessage);
    },
  });

  const handleViewDetails = (application: ExpertApplication) => {
    setSelectedApplication(application);
    setDetailModalVisible(true);
  };

  const handleApprove = (id: number) => {
    Modal.confirm({
      title: 'Утвердить анкету',
      content: 'Вы уверены, что хотите утвердить эту анкету?',
      onOk: () => {
        approveMutation.mutate(id);
      },
    });
  };

  const handleReject = (application: ExpertApplication) => {
    setSelectedApplication(application);
    setRejectModalVisible(true);
  };

  const handleRework = (application: ExpertApplication) => {
    setSelectedApplication(application);
    setReworkModalVisible(true);
  };

  const onRejectFinish = (values: { reason: string }) => {
    if (selectedApplication) {
      rejectMutation.mutate({ id: selectedApplication.id, reason: values.reason });
    }
  };

  const onReworkFinish = (values: { comment: string }) => {
    if (selectedApplication) {
      reworkMutation.mutate({ id: selectedApplication.id, comment: values.comment });
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig = {
      new: { color: 'blue', text: 'Новая' },
      under_review: { color: 'orange', text: 'На рассмотрении' },
      approved: { color: 'green', text: 'Одобрена' },
      rejected: { color: 'red', text: 'Отклонена' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: 'Имя',
      dataIndex: ['user', 'first_name'],
      key: 'first_name',
    },
    {
      title: 'Фамилия',
      dataIndex: ['user', 'last_name'],
      key: 'last_name',
    },
    {
      title: 'Email',
      dataIndex: ['user', 'email'],
      key: 'email',
    },
    {
      title: 'Дата подачи',
      dataIndex: 'application_submitted_at',
      key: 'submitted_at',
      render: (date: string) => date ? dayjs(date).format('DD.MM.YYYY HH:mm') : '-',
    },
    {
      title: 'Статус',
      dataIndex: 'status',
      key: 'status',
      render: (status: string | undefined, record: ExpertApplication) => {
        // Приоритет: status > application_approved > по датам
        if (status) return getStatusTag(status);
        if (record.application_approved) return getStatusTag('approved');
        if (record.application_reviewed_at || record.application_submitted_at) return getStatusTag('under_review');
        return getStatusTag('new');
      },
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 140,
      render: (_: any, record: ExpertApplication) => {
        // Определяем, можно ли выполнять действия (только для новых или на рассмотрении)
        const canModify = record.status === 'new' || record.status === 'under_review' || (!record.status && !record.application_approved);
        return (
          <Space>
            <Tooltip title="Просмотр">
              <Button
                type="text"
                icon={<EyeOutlined />}
                onClick={() => handleViewDetails(record)}
              />
            </Tooltip>
            {canModify && (
              <>
                <Tooltip title="Утвердить">
                  <Button
                    type="text"
                    icon={<CheckOutlined />}
                    onClick={() => handleApprove(record.id)}
                    style={{ color: '#52c41a' }}
                  />
                </Tooltip>
                <Tooltip title="Отклонить">
                  <Button
                    type="text"
                    icon={<CloseOutlined />}
                    onClick={() => handleReject(record)}
                    danger
                  />
                </Tooltip>
                <Tooltip title="На доработку">
                  <Button
                    type="text"
                    icon={<EditOutlined />}
                    onClick={() => handleRework(record)}
                  />
                </Tooltip>
              </>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div>
      <Card>
        <Title level={4}>Анкеты экспертов</Title>
        <Spin spinning={isLoading}>
          <Table
            columns={columns}
            dataSource={applications || []}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `Всего: ${total}`,
            }}
          />
        </Spin>
      </Card>

      {/* Модальное окно с деталями анкеты */}
      <Modal
        title="Детали анкеты эксперта"
        open={detailModalVisible}
        onCancel={() => {
          setDetailModalVisible(false);
          setSelectedApplication(null);
        }}
        footer={null}
        width={800}
        styles={{
          mask: {
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
        }}
      >
        {selectedApplication && (
          <div>
            <Descriptions column={2} bordered>
              <Descriptions.Item label="Имя">
                {selectedApplication.user.first_name}
              </Descriptions.Item>
              <Descriptions.Item label="Фамилия">
                {selectedApplication.user.last_name}
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {selectedApplication.user.email}
              </Descriptions.Item>
              <Descriptions.Item label="Телефон">
                {selectedApplication.user.phone || 'Не указан'}
              </Descriptions.Item>
              <Descriptions.Item label="Опыт работы">
                {selectedApplication.experience_years || selectedApplication.user.experience_years || 0} лет
              </Descriptions.Item>
              <Descriptions.Item label="Образование">
                {selectedApplication.education || selectedApplication.user.education || 'Не указано'}
              </Descriptions.Item>
              <Descriptions.Item label="Навыки" span={2}>
                {selectedApplication.skills || selectedApplication.user.skills || 'Не указано'}
              </Descriptions.Item>
              <Descriptions.Item label="Портфолио" span={2}>
                {selectedApplication.portfolio_url || selectedApplication.user.portfolio_url ? (
                  <a href={selectedApplication.portfolio_url || selectedApplication.user.portfolio_url} target="_blank" rel="noopener noreferrer">
                    {selectedApplication.portfolio_url || selectedApplication.user.portfolio_url}
                  </a>
                ) : (
                  'Не указано'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Биография" span={2}>
                {selectedApplication.biography || selectedApplication.bio || selectedApplication.user.bio || 'Не указано'}
              </Descriptions.Item>
              <Descriptions.Item label="Специализации" span={2}>
                {(selectedApplication.specializations || []).length > 0 ? (
                  selectedApplication.specializations!.map((spec: string, index: number) => (
                    <Tag key={index}>{spec}</Tag>
                  ))
                ) : (
                  'Не указано'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Дата подачи">
                {selectedApplication.application_submitted_at 
                  ? dayjs(selectedApplication.application_submitted_at).format('DD.MM.YYYY HH:mm')
                  : 'Не указано'}
              </Descriptions.Item>
              <Descriptions.Item label="Статус">
                {selectedApplication.application_approved 
                  ? getStatusTag('approved')
                  : selectedApplication.application_submitted_at 
                    ? getStatusTag('under_review')
                    : getStatusTag('new')}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16, textAlign: 'right' }}>
              <Space>
                <Button
                  onClick={() => {
                    setDetailModalVisible(false);
                    handleReject(selectedApplication);
                  }}
                  danger
                >
                  Отклонить
                </Button>
                <Button
                  onClick={() => {
                    setDetailModalVisible(false);
                    handleRework(selectedApplication);
                  }}
                >
                  На доработку
                </Button>
                <Button
                  type="primary"
                  onClick={() => handleApprove(selectedApplication.id)}
                  loading={approveMutation.isPending}
                >
                  Утвердить
                </Button>
              </Space>
            </div>
          </div>
        )}
      </Modal>

      {/* Модальное окно отклонения */}
      <Modal
        title="Отклонить анкету"
        open={rejectModalVisible}
        onCancel={() => {
          setRejectModalVisible(false);
          rejectForm.resetFields();
        }}
        onOk={() => rejectForm.submit()}
        confirmLoading={rejectMutation.isPending}
      >
        <Form
          form={rejectForm}
          layout="vertical"
          onFinish={onRejectFinish}
        >
          <Form.Item
            name="reason"
            label="Причина отклонения"
            rules={[{ required: true, message: 'Укажите причину отклонения' }]}
          >
            <TextArea
              rows={4}
              placeholder="Укажите причину отклонения анкеты"
            />
          </Form.Item>
        </Form>
      </Modal>

      {/* Модальное окно отправки на доработку */}
      <Modal
        title="Отправить на доработку"
        open={reworkModalVisible}
        onCancel={() => {
          setReworkModalVisible(false);
          reworkForm.resetFields();
        }}
        onOk={() => reworkForm.submit()}
        confirmLoading={reworkMutation.isPending}
      >
        <Form
          form={reworkForm}
          layout="vertical"
          onFinish={onReworkFinish}
        >
          <Form.Item
            name="comment"
            label="Комментарий"
            rules={[{ required: true, message: 'Укажите комментарий' }]}
          >
            <TextArea
              rows={4}
              placeholder="Укажите, что нужно доработать"
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default ExpertApplications;
