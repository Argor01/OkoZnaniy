import React, { useState, useEffect } from 'react';
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
  Row,
  Col,
} from 'antd';
import styles from './ExpertApplications.module.css';
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
} from '../../api/directorApi';
import { type ExpertApplication } from '../../api/types';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ExpertApplications: React.FC = () => {
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [reworkModalVisible, setReworkModalVisible] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ExpertApplication | null>(null);
  const [rejectForm] = Form.useForm();
  const [reworkForm] = Form.useForm();
  const [isMobile, setIsMobile] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 840);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
      queryClient.invalidateQueries({ queryKey: ['director-personnel'] });
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
      deactivated: { color: 'red', text: 'Деактивирована' },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', text: status };
    return <Tag color={config.color}>{config.text}</Tag>;
  };

  const columns = [
    {
      title: 'Фамилия',
      dataIndex: ['user', 'last_name'],
      key: 'last_name',
    },
    {
      title: 'Имя',
      dataIndex: ['user', 'first_name'],
      key: 'first_name',
    },
    {
      title: 'Отчество',
      dataIndex: ['user', 'middle_name'],
      key: 'middle_name',
      render: (text: string) => text || '-',
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

  const renderMobileCard = (application: ExpertApplication) => {
    const canModify = application.status === 'new' || application.status === 'under_review' || (!application.status && !application.application_approved);
    
    return (
      <Card 
        key={application.id} 
        className={styles.mobileCard}
        size="small"
      >
        <div className={styles.mobileUserInfo}>
          <div className={styles.mobileUserName}>
            {[application.user.last_name, application.user.first_name, application.user.middle_name]
              .filter(Boolean)
              .join(' ')}
          </div>
          <div className={styles.mobileUserEmail}>
            {application.user.email}
          </div>
        </div>
        
        <div className={styles.mobileMetaInfo}>
          <span className={styles.mobileDate}>
            {application.application_submitted_at 
              ? dayjs(application.application_submitted_at).format('DD.MM.YYYY')
              : '-'}
          </span>
          <div className={styles.statusTag}>
            {application.status
              ? getStatusTag(application.status)
              : application.application_approved
                ? getStatusTag('approved')
                : (application.application_reviewed_at || application.application_submitted_at)
                  ? getStatusTag('under_review')
                  : getStatusTag('new')}
          </div>
        </div>
        
        <div className={styles.mobileActions}>
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewDetails(application)}
          >
            Просмотр
          </Button>
          {canModify && (
            <>
              <Button
                size="small"
                type="primary"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(application.id)}
              >
                Утвердить
              </Button>
              <Button
                size="small"
                danger
                icon={<CloseOutlined />}
                onClick={() => handleReject(application)}
              >
                Отклонить
              </Button>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleRework(application)}
              >
                Доработка
              </Button>
            </>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div>
      <Card>
        <Title level={4}>Анкеты экспертов</Title>
        <Spin spinning={isLoading}>
          {isMobile ? (
            <div>
              {(applications || []).map(renderMobileCard)}
              {applications && applications.length > 0 && (
                <div style={{ textAlign: 'center', marginTop: 16 }}>
                  <Text type="secondary">Всего: {applications.length}</Text>
                </div>
              )}
            </div>
          ) : (
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
          )}
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
        width={isMobile ? '95%' : 800}
        style={isMobile ? { top: 20 } : {}}
        styles={{
          mask: {
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
          body: isMobile ? { padding: '12px' } : {},
        }}
      >
        {selectedApplication && (
          <div>
            <Descriptions 
              column={isMobile ? 1 : 2} 
              bordered 
              size={isMobile ? 'small' : 'default'}
            >
              <Descriptions.Item label="Фамилия">
                {selectedApplication.user.last_name}
              </Descriptions.Item>
              <Descriptions.Item label="Имя">
                {selectedApplication.user.first_name}
              </Descriptions.Item>
              <Descriptions.Item label="Отчество">
                {selectedApplication.user.middle_name || 'Не указано'}
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
              <Descriptions.Item label="Навыки" span={isMobile ? 1 : 2}>
                {selectedApplication.skills || selectedApplication.user.skills || 'Не указано'}
              </Descriptions.Item>
              <Descriptions.Item label="Портфолио" span={isMobile ? 1 : 2}>
                {selectedApplication.portfolio_url || selectedApplication.user.portfolio_url ? (
                  <a href={selectedApplication.portfolio_url || selectedApplication.user.portfolio_url} target="_blank" rel="noopener noreferrer">
                    {selectedApplication.portfolio_url || selectedApplication.user.portfolio_url}
                  </a>
                ) : (
                  'Не указано'
                )}
              </Descriptions.Item>
              <Descriptions.Item label="Биография" span={isMobile ? 1 : 2}>
                {selectedApplication.biography || selectedApplication.bio || selectedApplication.user.bio || 'Не указано'}
              </Descriptions.Item>
              <Descriptions.Item label="Специализации" span={isMobile ? 1 : 2}>
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
                {selectedApplication.status
                  ? getStatusTag(selectedApplication.status)
                  : selectedApplication.application_approved
                    ? getStatusTag('approved')
                    : (selectedApplication.application_reviewed_at || selectedApplication.application_submitted_at)
                      ? getStatusTag('under_review')
                      : getStatusTag('new')}
              </Descriptions.Item>
            </Descriptions>
            <div style={{ marginTop: 16, textAlign: isMobile ? 'center' : 'right' }}>
              {isMobile ? (
                <Row gutter={[8, 8]}>
                  <Col span={24}>
                    <Button
                      block
                      onClick={() => {
                        setDetailModalVisible(false);
                        handleReject(selectedApplication);
                      }}
                      danger
                    >
                      Отклонить
                    </Button>
                  </Col>
                  <Col span={24}>
                    <Button
                      block
                      onClick={() => {
                        setDetailModalVisible(false);
                        handleRework(selectedApplication);
                      }}
                    >
                      На доработку
                    </Button>
                  </Col>
                  <Col span={24}>
                    <Button
                      block
                      type="primary"
                      onClick={() => handleApprove(selectedApplication.id)}
                      loading={approveMutation.isPending}
                    >
                      Утвердить
                    </Button>
                  </Col>
                </Row>
              ) : (
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
              )}
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
        width={isMobile ? '95%' : 520}
        style={isMobile ? { top: 20 } : {}}
        styles={isMobile ? { body: { padding: '12px' } } : {}}
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
        width={isMobile ? '95%' : 520}
        style={isMobile ? { top: 20 } : {}}
        styles={isMobile ? { body: { padding: '12px' } } : {}}
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
