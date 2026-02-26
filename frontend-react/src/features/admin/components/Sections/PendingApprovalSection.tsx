import React, { useState } from 'react';
import { 
  Card, 
  Table, 
  Button, 
  Tag, 
  Space, 
  Typography, 
  Input,
  Modal,
  message,
  Tooltip,
  Select,
  DatePicker,
  Form,
  Divider,
  Avatar,
  Badge,
  Alert,
  Timeline,
  Popconfirm,
  Steps
} from 'antd';
import { 
  EyeOutlined,
  MessageOutlined,
  UserOutlined,
  CheckOutlined,
  CloseOutlined,
  SearchOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  TeamOutlined,
  WarningOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';

const { Text, Title, Paragraph } = Typography;
const { Search } = Input;
const { Option } = Select;
const { RangePicker } = DatePicker;
const { TextArea } = Input;
const { Step } = Steps;

import { ApprovalRequest, Claim } from '@/features/support/types/support';
import { useClaims, useClaimActions } from '../../hooks';

export const PendingApprovalSection: React.FC = () => {
  const { claims, loading, refetch } = useClaims('pending_approval', true);
  const { approveClaim, rejectApproval, escalateToDirector, requestMoreInfo } = useClaimActions();

  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedImpact, setSelectedImpact] = useState<string>('all');
  const [selectedEscalation, setSelectedEscalation] = useState<string>('all');
  
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [approveModalVisible, setApproveModalVisible] = useState(false);
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [moreInfoModalVisible, setMoreInfoModalVisible] = useState(false);
  const [selectedClaim, setSelectedClaim] = useState<Claim | null>(null);
  
  const [approveForm] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [moreInfoForm] = Form.useForm();

  
  const claimsData = Array.isArray(claims) ? claims : [];

  
  const filteredClaims = claimsData.filter(claim => {
    const searchLower = searchText.toLowerCase();
    const matchesSearch = (claim.title || '').toLowerCase().includes(searchLower) ||
                         (claim.description || '').toLowerCase().includes(searchLower) ||
                         `${claim.user.first_name || ''} ${claim.user.last_name || ''}`.toLowerCase().includes(searchLower);
    
    const matchesCategory = selectedCategory === 'all' || claim.category === selectedCategory;
    const matchesType = selectedType === 'all' || claim.approval_request.type === selectedType;
    const matchesImpact = selectedImpact === 'all' || claim.approval_request.estimated_impact === selectedImpact;
    
    let matchesEscalation = true;
    if (selectedEscalation !== 'all') {
      if (selectedEscalation === 'low' && claim.escalation_level > 1) matchesEscalation = false;
      if (selectedEscalation === 'medium' && (claim.escalation_level < 2 || claim.escalation_level > 2)) matchesEscalation = false;
      if (selectedEscalation === 'high' && claim.escalation_level < 3) matchesEscalation = false;
    }
    
    return matchesSearch && matchesCategory && matchesType && matchesImpact && matchesEscalation;
  });

  
  const handleViewClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    setViewModalVisible(true);
  };

  const handleApproveClaim = (claim: Claim) => {
    setSelectedClaim(claim);
    approveForm.resetFields();
    setApproveModalVisible(true);
  };

  const handleApproveSubmit = async () => {
    try {
      const values = await approveForm.validateFields();
      if (selectedClaim) {
        approveClaim(selectedClaim.id, values.decision);
        message.success(`Обращение "${selectedClaim.title}" одобрено`);
        setApproveModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleRejectApproval = (claim: Claim) => {
    setSelectedClaim(claim);
    rejectForm.resetFields();
    setRejectModalVisible(true);
  };

  const handleRejectSubmit = async () => {
    try {
      const values = await rejectForm.validateFields();
      if (selectedClaim) {
        rejectApproval(selectedClaim.id, values.reason);
        message.success(`Запрос на одобрение отклонен`);
        setRejectModalVisible(false);
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleEscalateToDirector = (claim: Claim) => {
    escalateToDirector(claim.id);
    message.success(`Обращение "${claim.title}" передано директору`);
  };

  const handleRequestMoreInfo = (claim: Claim) => {
    setSelectedClaim(claim);
    moreInfoForm.resetFields();
    setMoreInfoModalVisible(true);
  };

  const handleMoreInfoSubmit = async () => {
    try {
      const values = await moreInfoForm.validateFields();
      if (selectedClaim) {
        await requestMoreInfo(selectedClaim.id, values.questions);
        message.success('Запрос дополнительной информации отправлен');
        setMoreInfoModalVisible(false);
        refetch();
      }
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  
  const getCategoryColor = (category: string) => {
    const colors = {
      technical: 'blue',
      billing: 'green',
      order: 'orange',
      account: 'purple',
      other: 'gray',
    };
    return colors[category as keyof typeof colors] || 'gray';
  };

  const getCategoryText = (category: string) => {
    const texts = {
      technical: 'Техническая',
      billing: 'Оплата',
      order: 'Заказ',
      account: 'Аккаунт',
      other: 'Другое',
    };
    return texts[category as keyof typeof texts] || 'Другое';
  };

  const getTypeColor = (type: string) => {
    const colors = {
      escalation: 'red',
      refund: 'green',
      dispute_resolution: 'orange',
      account_action: 'purple',
      policy_exception: 'blue',
    };
    return colors[type as keyof typeof colors] || 'gray';
  };

  const getTypeText = (type: string) => {
    const texts = {
      escalation: 'Эскалация',
      refund: 'Возврат',
      dispute_resolution: 'Решение спора',
      account_action: 'Действие с аккаунтом',
      policy_exception: 'Исключение из политики',
    };
    return texts[type as keyof typeof texts] || 'Другое';
  };

  const getImpactColor = (impact: string) => {
    const colors = {
      low: 'green',
      medium: 'orange',
      high: 'red',
      critical: 'magenta',
    };
    return colors[impact as keyof typeof colors] || 'gray';
  };

  const getImpactText = (impact: string) => {
    const texts = {
      low: 'Низкое',
      medium: 'Среднее',
      high: 'Высокое',
      critical: 'Критическое',
    };
    return texts[impact as keyof typeof texts] || 'Среднее';
  };

  const getEscalationColor = (level: number) => {
    if (level >= 3) return 'red';
    if (level >= 2) return 'orange';
    return 'green';
  };

  const formatWaitingTime = (hours: number) => {
    if (hours < 24) {
      return `${Math.round(hours)} ч`;
    }
    const days = Math.floor(hours / 24);
    const remainingHours = Math.round(hours % 24);
    return remainingHours > 0 ? `${days}д ${remainingHours}ч` : `${days}д`;
  };

  const columns = [
    {
      title: 'Обращение',
      key: 'claim',
      render: (record: Claim) => (
        <div>
          <div className="pendingApprovalClaimTitle">
            {record.title}
          </div>
          <Text type="secondary" className="pendingApprovalDescription">
            {record.description.length > 80 
              ? `${record.description.substring(0, 80)}...` 
              : record.description
            }
          </Text>
          <div className="pendingApprovalTagRow">
            <Tag color={getCategoryColor(record.category)}>
              {getCategoryText(record.category)}
            </Tag>
            <Tag color={getTypeColor(record.approval_request.type)}>
              {getTypeText(record.approval_request.type)}
            </Tag>
            {record.approval_request.requires_director_approval && (
              <Tag color="gold" icon={<TeamOutlined />}>
                Директор
              </Tag>
            )}
          </div>
        </div>
      ),
    },
    {
      title: 'Пользователь',
      key: 'user',
      width: 150,
      render: (record: Claim) => (
        <div className="pendingApprovalUserRow">
          <Avatar 
            size="small" 
            icon={<UserOutlined />}
            src={record.user.avatar}
          />
          <div>
            <div className="pendingApprovalUserName">
              {record.user.first_name} {record.user.last_name}
            </div>
            <Text type="secondary" className="pendingApprovalUserHandle">
              @{record.user.username}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Администратор',
      key: 'admin',
      width: 150,
      render: (record: Claim) => (
        <div>
          <div className="pendingApprovalUserName">
            {record.assigned_admin.first_name} {record.assigned_admin.last_name}
          </div>
          <Text type="secondary" className="pendingApprovalUserHandle">
            @{record.assigned_admin.username}
          </Text>
        </div>
      ),
    },
    {
      title: 'Влияние',
      key: 'impact',
      width: 100,
      render: (record: Claim) => (
        <div className="pendingApprovalCenterCell">
          <Tag color={getImpactColor(record.approval_request.estimated_impact)}>
            {getImpactText(record.approval_request.estimated_impact)}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Ожидание',
      key: 'waiting_time',
      width: 100,
      render: (record: Claim) => (
        <div className="pendingApprovalCenterCell">
          <div
            className={`pendingApprovalWaitingTime ${
              record.waiting_time_hours > 48
                ? 'pendingApprovalWaitingCritical'
                : record.waiting_time_hours > 24
                ? 'pendingApprovalWaitingWarning'
                : 'pendingApprovalWaitingOk'
            }`}
          >
            {formatWaitingTime(record.waiting_time_hours)}
          </div>
          <Tag 
            color={getEscalationColor(record.escalation_level)}
          >
            Ур. {record.escalation_level}
          </Tag>
        </div>
      ),
    },
    {
      title: 'Сообщения',
      dataIndex: 'messages_count',
      key: 'messages_count',
      width: 80,
      render: (count: number) => (
        <div className="pendingApprovalCenterCell">
          <Badge count={count} showZero>
            <MessageOutlined className="pendingApprovalMessageIcon" />
          </Badge>
        </div>
      ),
    },
    {
      title: 'Действия',
      key: 'actions',
      width: 200,
      render: (record: Claim) => (
        <Space size="small">
          <Tooltip title="Просмотреть">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => handleViewClaim(record)}
            />
          </Tooltip>
          <Tooltip title="Одобрить">
            <Button 
              size="small" 
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => handleApproveClaim(record)}
            />
          </Tooltip>
          <Tooltip title="Отклонить">
            <Button 
              size="small" 
              danger
              icon={<CloseOutlined />}
              onClick={() => handleRejectApproval(record)}
            />
          </Tooltip>
          <Tooltip title="Запросить информацию">
            <Button 
              size="small" 
              icon={<MessageOutlined />}
              onClick={() => handleRequestMoreInfo(record)}
            />
          </Tooltip>
          {record.approval_request.requires_director_approval && (
            <Tooltip title="Передать директору">
              <Button 
                size="small" 
                icon={<TeamOutlined />}
                onClick={() => handleEscalateToDirector(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card>
        <div className="pendingApprovalSectionHeader">
          <Title level={4}>Ожидают решения</Title>
          <Text type="secondary">
            Обращения, требующие одобрения руководства или принятия решения
          </Text>
        </div>

        
        {filteredClaims.some(claim => claim.waiting_time_hours > 48) && (
          <Alert
            message="Внимание!"
            description={`${filteredClaims.filter(claim => claim.waiting_time_hours > 48).length} обращений ожидают решения более 48 часов`}
            type="warning"
            showIcon
            className="pendingApprovalAlert"
          />
        )}

        <div className="pendingApprovalFiltersRow">
          <Search
            placeholder="Поиск по обращениям"
            allowClear
            className="pendingApprovalSearch"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            prefix={<SearchOutlined />}
          />
          
          <Select
            placeholder="Категория"
            className="pendingApprovalSelectCategory"
            value={selectedCategory}
            onChange={setSelectedCategory}
          >
            <Option value="all">Все категории</Option>
            <Option value="technical">Техническая</Option>
            <Option value="billing">Оплата</Option>
            <Option value="order">Заказ</Option>
            <Option value="account">Аккаунт</Option>
            <Option value="other">Другое</Option>
          </Select>

          <Select
            placeholder="Тип запроса"
            className="pendingApprovalSelectType"
            value={selectedType}
            onChange={setSelectedType}
          >
            <Option value="all">Все типы</Option>
            <Option value="escalation">Эскалация</Option>
            <Option value="refund">Возврат</Option>
            <Option value="dispute_resolution">Решение спора</Option>
            <Option value="account_action">Действие с аккаунтом</Option>
            <Option value="policy_exception">Исключение из политики</Option>
          </Select>

          <Select
            placeholder="Влияние"
            className="pendingApprovalSelectImpact"
            value={selectedImpact}
            onChange={setSelectedImpact}
          >
            <Option value="all">Все</Option>
            <Option value="critical">Критическое</Option>
            <Option value="high">Высокое</Option>
            <Option value="medium">Среднее</Option>
            <Option value="low">Низкое</Option>
          </Select>

          <Select
            placeholder="Эскалация"
            className="pendingApprovalSelectEscalation"
            value={selectedEscalation}
            onChange={setSelectedEscalation}
          >
            <Option value="all">Все уровни</Option>
            <Option value="high">Высокий (3+)</Option>
            <Option value="medium">Средний (2)</Option>
            <Option value="low">Низкий (1)</Option>
          </Select>
        </div>

        <Table
          columns={columns}
          dataSource={filteredClaims as any[]}
          rowKey="id"
          loading={loading}
          pagination={{ 
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} из ${total} обращений`
          }}
          locale={{ emptyText: 'Обращения, ожидающие решения, не найдены' }}
          size="small"
          rowClassName={(record) => 
            record.waiting_time_hours > 48 ? 'urgent-row' : 
            record.waiting_time_hours > 24 ? 'warning-row' : ''
          }
        />
      </Card>

      
      <Modal
        title="Детали обращения, ожидающего решения"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Закрыть
          </Button>,
          <Button 
            key="approve" 
            type="primary" 
            icon={<CheckOutlined />}
            onClick={() => {
              if (selectedClaim) {
                setViewModalVisible(false);
                handleApproveClaim(selectedClaim);
              }
            }}
          >
            Одобрить
          </Button>,
        ]}
        width={900}
      >
        {selectedClaim && (
          <div>
            <div className="pendingApprovalModalHeader">
              <Title level={5}>{selectedClaim.title}</Title>
              <Space>
                <Tag color={getCategoryColor(selectedClaim.category)}>
                  {getCategoryText(selectedClaim.category)}
                </Tag>
                <Tag color={getTypeColor(selectedClaim.approval_request.type)}>
                  {getTypeText(selectedClaim.approval_request.type)}
                </Tag>
                <Tag color={getImpactColor(selectedClaim.approval_request.estimated_impact)}>
                  {getImpactText(selectedClaim.approval_request.estimated_impact)} влияние
                </Tag>
                {selectedClaim.approval_request.requires_director_approval && (
                  <Tag color="gold" icon={<TeamOutlined />}>
                    Требует одобрения директора
                  </Tag>
                )}
              </Space>
            </div>

            <Alert
              message={`Ожидает решения ${formatWaitingTime(selectedClaim.waiting_time_hours)}`}
              type={selectedClaim.waiting_time_hours > 48 ? 'error' : selectedClaim.waiting_time_hours > 24 ? 'warning' : 'info'}
              showIcon
              className="pendingApprovalModalAlert"
            />

            <Divider />

            <div className="pendingApprovalModalUserRow">
              <div className="pendingApprovalModalColumn">
                <Text strong>Пользователь:</Text>
                <div className="pendingApprovalModalUserInfo">
                  <Avatar icon={<UserOutlined />} />
                  <div>
                    <div>{selectedClaim.user.first_name} {selectedClaim.user.last_name}</div>
                    <Text type="secondary">@{selectedClaim.user.username}</Text>
                    <br />
                    <Text type="secondary">{selectedClaim.user.email}</Text>
                  </div>
                </div>
              </div>

              <div className="pendingApprovalModalColumn">
                <Text strong>Администратор:</Text>
                <div className="pendingApprovalModalUserInfo">
                  <Avatar icon={<UserOutlined />} />
                  <div>
                    <div>{selectedClaim.assigned_admin.first_name} {selectedClaim.assigned_admin.last_name}</div>
                    <Text type="secondary">@{selectedClaim.assigned_admin.username}</Text>
                  </div>
                </div>
              </div>
            </div>

            <div className="pendingApprovalSectionBlock">
              <Text strong>Описание проблемы:</Text>
              <Paragraph className="pendingApprovalParagraphSpacing">
                {selectedClaim.description}
              </Paragraph>
            </div>

            <div className="pendingApprovalSectionBlock">
              <Text strong>Обоснование запроса:</Text>
              <Paragraph className="pendingApprovalReasonBox">
                {selectedClaim.approval_request.reason}
              </Paragraph>
            </div>

            <div className="pendingApprovalSectionBlock">
              <Text strong>Предлагаемое действие:</Text>
              <Paragraph className="pendingApprovalActionBox">
                {selectedClaim.approval_request.proposed_action}
              </Paragraph>
            </div>

            {selectedClaim.attachments && selectedClaim.attachments.length > 0 && (
              <div className="pendingApprovalSectionBlock">
                <Text strong>Вложения:</Text>
                <div className="pendingApprovalAttachmentsRow">
                  {selectedClaim.attachments.map((file, index) => (
                    <Tag key={index} color="blue">📎 {file}</Tag>
                  ))}
                </div>
              </div>
            )}

            <div className="pendingApprovalMetaRow">
              <span>Создано: {dayjs(selectedClaim.created_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Взято в работу: {dayjs(selectedClaim.taken_at).format('DD.MM.YYYY HH:mm')}</span>
              <span>Запрос одобрения: {dayjs(selectedClaim.approval_request.requested_at).format('DD.MM.YYYY HH:mm')}</span>
            </div>

            <div className="pendingApprovalMetaSummary">
              Уровень эскалации: {selectedClaim.escalation_level} | 
              Сообщений: {selectedClaim.messages_count}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        title="Одобрить запрос"
        open={approveModalVisible}
        onOk={handleApproveSubmit}
        onCancel={() => setApproveModalVisible(false)}
        okText="Одобрить"
        cancelText="Отмена"
      >
        <Form form={approveForm} layout="vertical">
          <Form.Item
            name="decision"
            label="Решение и комментарии"
            rules={[{ required: true, message: 'Опишите принятое решение' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Опишите принятое решение и дальнейшие действия..."
            />
          </Form.Item>
        </Form>
      </Modal>

      
      <Modal
        title="Отклонить запрос"
        open={rejectModalVisible}
        onOk={handleRejectSubmit}
        onCancel={() => setRejectModalVisible(false)}
        okText="Отклонить"
        cancelText="Отмена"
        okButtonProps={{ danger: true }}
      >
        <Form form={rejectForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Причина отклонения"
            rules={[{ required: true, message: 'Укажите причину отклонения' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Опишите причину отклонения запроса..."
            />
          </Form.Item>
        </Form>
      </Modal>

      
      <Modal
        title="Запросить дополнительную информацию"
        open={moreInfoModalVisible}
        onOk={handleMoreInfoSubmit}
        onCancel={() => setMoreInfoModalVisible(false)}
        okText="Отправить"
        cancelText="Отмена"
      >
        <Form form={moreInfoForm} layout="vertical">
          <Form.Item
            name="questions"
            label="Вопросы и уточнения"
            rules={[{ required: true, message: 'Укажите, какая информация нужна' }]}
          >
            <TextArea 
              rows={4} 
              placeholder="Опишите, какая дополнительная информация или документы нужны для принятия решения..."
            />
          </Form.Item>
        </Form>
      </Modal>

      <style>{`
        .urgent-row {
          background-color: #fff2f0 !important;
        }
        .warning-row {
          background-color: #fffbe6 !important;
        }
      `}</style>
    </div>
  );
};
