import React, { useEffect, useState } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Spin,
  message,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  DatePicker,
  Tag,
  Statistic,
  Row,
  Col,
  Descriptions,
  Typography,
  Tooltip,
} from 'antd';
import {
  EyeOutlined,
  EditOutlined,
  StopOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  SearchOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs, { type Dayjs } from 'dayjs';
import {
  getPartners,
  updatePartnerCommission,
  togglePartnerStatus,
} from '../../api/directorApi';
import type { Partner } from '../../api/types';
import type { ColumnsType } from 'antd/es/table';
import styles from './PartnerList.module.css';
import mobileStyles from '../shared/MobileDatePicker.module.css';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;
const { Option } = Select;

const PartnerList: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[Dayjs, Dayjs] | null>(null);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [commissionModalVisible, setCommissionModalVisible] = useState(false);
  const [referralsModalVisible, setReferralsModalVisible] = useState(false);
  
  const isMobile = window.innerWidth <= 840;

  const [commissionForm] = Form.useForm();

  const { data: partners = [], isLoading, error: partnersError } = useQuery<Partner[], unknown, Partner[]>({
    queryKey: ['director-partners'],
    queryFn: getPartners,
  });
  
  useEffect(() => {
    if (partnersError) {
      message.error('Ошибка при загрузке списка партнёров');
    }
  }, [partnersError]);

  const updateCommissionMutation = useMutation({
    mutationFn: ({ partnerId, commission }: { partnerId: number; commission: number }) =>
      updatePartnerCommission(partnerId, commission),
    onSuccess: () => {
      message.success('Процент комиссии обновлён');
      queryClient.invalidateQueries({ queryKey: ['director-partners'] });
      setCommissionModalVisible(false);
      commissionForm.resetFields();
    },
    onError: (error: any) => {
      message.error('Ошибка при обновлении комиссии');
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: (partnerId: number) => togglePartnerStatus(partnerId),
    onSuccess: () => {
      message.success('Статус партнёра обновлён');
      queryClient.invalidateQueries({ queryKey: ['director-partners'] });
    },
    onError: (error: any) => {
      message.error('Ошибка при изменении статуса');
    },
  });

  const handleViewDetails = (partner: Partner) => {
    setSelectedPartner(partner);
    setDetailModalVisible(true);
  };

  const handleEditCommission = (partner: Partner) => {
    setSelectedPartner(partner);
    commissionForm.setFieldsValue({
      commission: partner.commissionPercent || partner.commission_percent || 0,
    });
    setCommissionModalVisible(true);
  };

  const handleToggleStatus = (partner: Partner) => {
    Modal.confirm({
      title: partner.isActive || partner.is_active ? 'Деактивировать партнёра?' : 'Активировать партнёра?',
      content: `Вы уверены, что хотите ${partner.isActive || partner.is_active ? 'деактивировать' : 'активировать'} партнёра ${partner.firstName || partner.first_name} ${partner.lastName || partner.last_name}?`,
      okText: 'Да',
      cancelText: 'Отмена',
      onOk: () => {
        toggleStatusMutation.mutate(partner.id);
      },
    });
  };

  const handleShowReferrals = (partner: Partner) => {
    setSelectedPartner(partner);
    setReferralsModalVisible(true);
  };

  const handleCommissionSubmit = async (values: any) => {
    if (selectedPartner) {
      updateCommissionMutation.mutate({
        partnerId: selectedPartner.id,
        commission: values.commission,
      });
    }
  };

  const filteredPartners = React.useMemo(() => {
    if (!partners) return [];

    return partners.filter((partner) => {
      const matchesSearch =
        !searchText ||
        (partner.firstName || partner.first_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (partner.lastName || partner.last_name || '').toLowerCase().includes(searchText.toLowerCase()) ||
        partner.email.toLowerCase().includes(searchText.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && (partner.isActive || partner.is_active)) ||
        (statusFilter === 'inactive' && !(partner.isActive || partner.is_active));

      const matchesDateRange =
        !dateRange ||
        (dayjs(partner.dateJoined || partner.date_joined).isAfter(dateRange[0]) &&
          dayjs(partner.dateJoined || partner.date_joined).isBefore(dateRange[1]));

      return matchesSearch && matchesStatus && matchesDateRange;
    });
  }, [partners, searchText, statusFilter, dateRange]);

  const activePartnersCount = partners?.filter((p) => p.isActive || p.is_active).length || 0;
  const totalPartnersCount = partners?.length || 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ru-RU', {
      style: 'currency',
      currency: 'RUB',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const columns: ColumnsType<Partner> = [
    {
      title: 'Имя и фамилия',
      key: 'name',
      width: 150,
      render: (_, record) => `${record.firstName || record.first_name} ${record.lastName || record.last_name}`,
      sorter: (a, b) =>
        (a.firstName || a.first_name || '').localeCompare(b.firstName || b.first_name || ''),
      fixed: 'left' as const,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 180,
      ellipsis: true,
    },
    {
      title: 'Телефон',
      dataIndex: 'phone',
      key: 'phone',
      width: 130,
      render: (phone) => phone || '-',
    },
    {
      title: 'Дата регистрации',
      key: 'dateJoined',
      width: 120,
      render: (_, record) =>
        dayjs(record.dateJoined || record.date_joined).format('DD.MM.YYYY'),
      sorter: (a, b) =>
        dayjs(a.dateJoined || a.date_joined).unix() - dayjs(b.dateJoined || b.date_joined).unix(),
    },
    {
      title: 'Реферальный код',
      key: 'referralCode',
      width: 140,
      render: (_, record) => {
        const code = record.referralCode || record.referral_code || '-';
        return (
          <Tooltip title={code}>
            <Text copyable style={{ maxWidth: '120px', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {code}
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: 'Комиссия',
      key: 'commission',
      width: 90,
      render: (_, record) => `${record.commissionPercent || record.commission_percent || 0}%`,
      sorter: (a, b) =>
        (a.commissionPercent || a.commission_percent || 0) - (b.commissionPercent || b.commission_percent || 0),
    },
    {
      title: 'Рефералов',
      key: 'referrals',
      width: 110,
      render: (_, record) => {
        const total = record.totalReferrals || record.total_referrals || 0;
        const active = record.activeReferrals || record.active_referrals || 0;
        return (
          <Tooltip title={`Всего: ${total}, Активных: ${active}`}>
            <span style={{ cursor: 'help' }}>{total} / {active}</span>
          </Tooltip>
        );
      },
      sorter: (a, b) =>
        (a.totalReferrals || a.total_referrals || 0) - (b.totalReferrals || b.total_referrals || 0),
    },
    {
      title: 'Доход',
      key: 'totalEarnings',
      width: 120,
      render: (_, record) => {
        const amount = record.totalEarnings || record.total_earnings || 0;
        const formatted = formatCurrency(amount);
        if (amount >= 1000000) {
          return (
            <Tooltip title={formatted}>
              <span style={{ cursor: 'help' }}>{(amount / 1000000).toFixed(1)}М ₽</span>
            </Tooltip>
          );
        } else if (amount >= 1000) {
          return (
            <Tooltip title={formatted}>
              <span style={{ cursor: 'help' }}>{(amount / 1000).toFixed(0)}К ₽</span>
            </Tooltip>
          );
        }
        return <span>{formatted}</span>;
      },
      sorter: (a, b) =>
        (a.totalEarnings || a.total_earnings || 0) - (b.totalEarnings || b.total_earnings || 0),
    },
    {
      title: 'Статус',
      key: 'status',
      width: 100,
      render: (_, record) => (
        <Tag color={(record.isActive || record.is_active) ? 'green' : 'red'}>
          {(record.isActive || record.is_active) ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
      filters: [
        { text: 'Активен', value: true },
        { text: 'Неактивен', value: false },
      ],
      onFilter: (value, record) => (record.isActive || record.is_active) === value,
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 140,
      render: (_, record) => (
        <Space>
          <Tooltip title="Просмотр">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Изменить процент комиссии">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditCommission(record)}
            />
          </Tooltip>
          <Tooltip title={(record.isActive || record.is_active) ? 'Деактивировать' : 'Активировать'}>
            <Button
              type="text"
              icon={(record.isActive || record.is_active) ? <StopOutlined /> : <CheckCircleOutlined />}
              onClick={() => handleToggleStatus(record)}
              danger={(record.isActive || record.is_active)}
            />
          </Tooltip>
          <Tooltip title="Список рефералов">
            <Button
              type="text"
              icon={<TeamOutlined />}
              onClick={() => handleShowReferrals(record)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const referralColumns: ColumnsType<any> = [
    {
      title: 'Имя',
      key: 'name',
      render: (_, record) => `${record.first_name || ''} ${record.last_name || ''}`,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
    },
    {
      title: 'Дата регистрации',
      key: 'dateJoined',
      render: (_, record) => dayjs(record.date_joined).format('DD.MM.YYYY'),
    },
    {
      title: 'Статус',
      key: 'status',
      render: (_, record) => (
        <Tag color={record.is_active ? 'green' : 'red'}>
          {record.is_active ? 'Активен' : 'Неактивен'}
        </Tag>
      ),
    },
  ];

  return (
    <div>
      
      <Row gutter={[16, isMobile ? 12 : 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} md={8}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center'
          }}>
            <Statistic
              title="Активных партнёров"
              value={activePartnersCount}
              suffix={`/ ${totalPartnersCount}`}
              valueStyle={{ 
                color: '#3f8600',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              style={{
                padding: isMobile ? '8px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center'
          }}>
            <Statistic
              title="Общий доход партнёров"
              value={partners?.reduce((sum, p) => sum + (p.totalEarnings || p.total_earnings || 0), 0) || 0}
              prefix="₽"
              precision={2}
              valueStyle={{ 
                color: '#1890ff',
                fontSize: isMobile ? 20 : 24,
                fontWeight: 600
              }}
              style={{
                padding: isMobile ? '8px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={24} md={8}>
          <Card style={{ 
            borderRadius: isMobile ? 8 : 12,
            textAlign: 'center',
            background: isMobile ? '#f9f0ff' : '#fff',
            border: isMobile ? '2px solid #722ed1' : '1px solid #d9d9d9'
          }}>
            <Statistic
              title="Всего рефералов"
              value={partners?.reduce((sum, p) => sum + (p.totalReferrals || p.total_referrals || 0), 0) || 0}
              valueStyle={{ 
                color: '#722ed1',
                fontSize: isMobile ? 22 : 24,
                fontWeight: 700
              }}
              style={{
                padding: isMobile ? '12px 0' : '12px 0'
              }}
            />
          </Card>
        </Col>
      </Row>

      
      <Card style={{ 
        marginBottom: 16,
        borderRadius: isMobile ? 8 : 12
      }}>
        <Space 
          direction="vertical" 
          style={{ width: '100%' }} 
          size={isMobile ? "middle" : "large"}
        >
          {isMobile ? (
            <>
              <Input
                placeholder="Поиск по имени или email"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: '100%' }}
                size="large"
                allowClear
              />
              <Row gutter={[8, 8]}>
                <Col span={12}>
                  <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    style={{ width: '100%' }}
                    size="large"
                    placeholder="Статус"
                  >
                    <Option value="all">Все</Option>
                    <Option value="active">Активные</Option>
                    <Option value="inactive">Неактивные</Option>
                  </Select>
                </Col>
                <Col span={12}>
                  <Button 
                    onClick={() => {
                      setSearchText('');
                      setStatusFilter('all');
                      setDateRange(null);
                    }}
                    style={{ width: '100%', height: 40 }}
                    size="large"
                  >
                    Сбросить
                  </Button>
                </Col>
              </Row>
              <div className={mobileStyles.datePickerContainer}>
                <RangePicker
                  value={dateRange}
                  onChange={setDateRange}
                  format="DD.MM.YYYY"
                  placeholder={['Дата от', 'Дата до']}
                  className={mobileStyles.mobileRangePicker}
                  size="large"
                  getPopupContainer={(trigger) => trigger.parentElement || document.body}
                />
              </div>
            </>
          ) : (
            <Space wrap>
              <Input
                placeholder="Поиск по имени или email"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                style={{ width: 300 }}
                allowClear
              />
              <Select
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: 150 }}
              >
                <Option value="all">Все</Option>
                <Option value="active">Активные</Option>
                <Option value="inactive">Неактивные</Option>
              </Select>
              <RangePicker
                value={dateRange}
                onChange={setDateRange}
                format="DD.MM.YYYY"
                placeholder={['Дата от', 'Дата до']}
              />
              <Button onClick={() => {
                setSearchText('');
                setStatusFilter('all');
                setDateRange(null);
              }}>
                Сбросить фильтры
              </Button>
            </Space>
          )}
        </Space>
      </Card>

      
      <Card style={{ 
        borderRadius: isMobile ? 8 : 12,
        overflow: 'auto'
      }}>
        <Spin spinning={isLoading}>
          <Table
            columns={columns}
            dataSource={filteredPartners}
            rowKey="id"
            scroll={{ x: 1200 }}
            pagination={{
              pageSize: 10,
              showSizeChanger: !isMobile,
              showTotal: (total) => `Всего: ${total}`,
              simple: isMobile,
              style: {
                padding: isMobile ? '12px' : '16px',
                marginRight: 8
              }
            }}
            size={isMobile ? "middle" : "small"}
          />
        </Spin>
      </Card>

      
      <Modal
        title="Детальная информация о партнёре"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button 
            key="close" 
            onClick={() => setDetailModalVisible(false)}
            size={isMobile ? 'large' : 'middle'}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            Закрыть
          </Button>,
        ]}
        width={isMobile ? '100%' : 800}
        style={isMobile ? {
          top: 0,
          padding: 0,
          maxWidth: '100%',
          margin: 0
        } : {}}
        styles={{
          mask: {
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
          content: isMobile ? {
            borderRadius: 0,
            height: '100vh'
          } : {},
          body: isMobile ? {
            maxHeight: 'calc(100vh - 55px)',
            overflowY: 'auto'
          } : {}
        }}
      >
        {selectedPartner && (
          <Descriptions 
            bordered 
            column={isMobile ? 1 : 2}
            size={isMobile ? 'middle' : 'default'}
          >
            <Descriptions.Item label="Имя">
              {selectedPartner.firstName || selectedPartner.first_name}
            </Descriptions.Item>
            <Descriptions.Item label="Фамилия">
              {selectedPartner.lastName || selectedPartner.last_name}
            </Descriptions.Item>
            <Descriptions.Item label="Email">{selectedPartner.email}</Descriptions.Item>
            <Descriptions.Item label="Телефон">{selectedPartner.phone || '-'}</Descriptions.Item>
            <Descriptions.Item label="Дата регистрации">
              {dayjs(selectedPartner.dateJoined || selectedPartner.date_joined).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Реферальный код">
              <Text copyable>{selectedPartner.referralCode || selectedPartner.referral_code || '-'}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Процент комиссии">
              {selectedPartner.commissionPercent || selectedPartner.commission_percent || 0}%
            </Descriptions.Item>
            <Descriptions.Item label="Статус">
              <Tag color={(selectedPartner.isActive || selectedPartner.is_active) ? 'green' : 'red'}>
                {(selectedPartner.isActive || selectedPartner.is_active) ? 'Активен' : 'Неактивен'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Всего рефералов">
              {selectedPartner.totalReferrals || selectedPartner.total_referrals || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Активных рефералов">
              {selectedPartner.activeReferrals || selectedPartner.active_referrals || 0}
            </Descriptions.Item>
            <Descriptions.Item label="Общий доход" span={2}>
              {formatCurrency(selectedPartner.totalEarnings || selectedPartner.total_earnings || 0)}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      
      <Modal
        title="Изменить процент комиссии"
        open={commissionModalVisible}
        className={styles.compactModal}
        onCancel={() => {
          setCommissionModalVisible(false);
          commissionForm.resetFields();
        }}
        onOk={() => commissionForm.submit()}
        confirmLoading={updateCommissionMutation.isPending}
        width={isMobile ? (window.innerWidth <= 380 ? '95%' : '90%') : 400}
        centered
        style={isMobile ? {
          maxWidth: window.innerWidth <= 380 ? '95%' : '90%',
          margin: '0 auto'
        } : {}}

        styles={{
          body: isMobile ? {
            padding: '4px 16px 2px 16px',
            minHeight: 'auto',
            height: 'auto'
          } : {
            padding: '16px 20px 8px 20px',
            minHeight: 'auto'
          },
          footer: isMobile ? {
            padding: '4px 16px 8px 16px',
            marginTop: 0
          } : {
            padding: '8px 20px 16px 20px',
            marginTop: 0
          }
        }}
        okButtonProps={{
          size: isMobile ? 'large' : 'middle'
        }}
        cancelButtonProps={{
          size: isMobile ? 'large' : 'middle'
        }}
      >
        <Form
          form={commissionForm}
          layout="vertical"
          onFinish={handleCommissionSubmit}
        >
          <Form.Item
            name="commission"
            label="Процент комиссии (%)"
            rules={[
              { required: true, message: 'Введите процент комиссии' },
              { type: 'number', min: 0, max: 100, message: 'Процент должен быть от 0 до 100' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              min={0}
              max={100}
              precision={2}
              step={0.1}
              size={isMobile ? 'large' : 'middle'}
              placeholder="Введите процент от 0 до 100"
            />
          </Form.Item>
        </Form>
      </Modal>

      
      <Modal
        title="Список рефералов"
        open={referralsModalVisible}
        onCancel={() => setReferralsModalVisible(false)}
        footer={[
          <Button 
            key="close" 
            onClick={() => setReferralsModalVisible(false)}
            size={isMobile ? 'large' : 'middle'}
            style={{ width: isMobile ? '100%' : 'auto' }}
          >
            Закрыть
          </Button>,
        ]}
        width={isMobile ? '100%' : 800}
        style={isMobile ? {
          top: 0,
          padding: 0,
          maxWidth: '100%',
          margin: 0
        } : {}}
        styles={{
          mask: {
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
          },
          content: isMobile ? {
            borderRadius: 0,
            height: '100vh'
          } : {},
          body: isMobile ? {
            maxHeight: 'calc(100vh - 55px)',
            overflowY: 'auto'
          } : {}
        }}
      >
        {selectedPartner && (
          <Table
            columns={referralColumns}
            dataSource={selectedPartner.referrals || []}
            rowKey="id"
            pagination={{ pageSize: 5 }}
          />
        )}
      </Modal>
    </div>
  );
};

export default PartnerList;
