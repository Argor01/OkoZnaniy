import React, { useState } from 'react';
import {
  Modal,
  Descriptions,
  Typography,
  Tag,
  Divider,
  Space,
  Button,
  Timeline,
  Empty,
  Alert,
  Tabs,
  Form,
  Input,
  Select,
  message,
} from 'antd';
import {
  CheckCircleOutlined,
  UserOutlined,
  FileTextOutlined,
  SendOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { arbitratorApi } from '../../api/arbitratorApi';
import type { Claim, RequestInfoRequest, SendForApprovalRequest } from '../../api/types';
import DecisionForm from './DecisionForm';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface ClaimDetailsProps {
  claim: Claim;
  visible: boolean;
  onClose: () => void;
  onTakeClaim?: () => void;
  showDecisionForm?: boolean;
}


const getTypeColor = (type: string) => {
  switch (type) {
    case 'refund':
      return 'blue';
    case 'dispute':
      return 'orange';
    case 'conflict':
      return 'red';
    default:
      return 'default';
  }
};

const getTypeText = (type: string) => {
  switch (type) {
    case 'refund':
      return 'Возврат средств';
    case 'dispute':
      return 'Арбитраж';
    case 'conflict':
      return 'Конфликт';
    default:
      return type;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'red';
    case 'medium':
      return 'orange';
    case 'low':
      return 'default';
    default:
      return 'default';
  }
};

const getPriorityText = (priority: string) => {
  switch (priority) {
    case 'high':
      return 'Высокий';
    case 'medium':
      return 'Средний';
    case 'low':
      return 'Низкий';
    default:
      return priority;
  }
};

const ClaimDetails: React.FC<ClaimDetailsProps> = ({
  claim,
  visible,
  onClose,
  onTakeClaim,
  showDecisionForm = false,
}) => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('info');
  const [requestInfoForm] = Form.useForm();
  const [approvalForm] = Form.useForm();

  
  const requestInfoMutation = useMutation({
    mutationFn: (data: RequestInfoRequest) =>
      arbitratorApi.requestInfo(claim.id, data),
    onSuccess: () => {
      message.success('Запрос отправлен');
      requestInfoForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['arbitrator-claims'] });
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.detail || 'Ошибка при отправке запроса');
    },
  });

  
  const sendForApprovalMutation = useMutation({
    mutationFn: (data: SendForApprovalRequest) =>
      arbitratorApi.sendForApproval(claim.id, data),
    onSuccess: () => {
      message.success('Обращение отправлено на согласование');
      approvalForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ['arbitrator-claims'] });
      onClose();
    },
    onError: (error: any) => {
      message.error(error?.response?.data?.detail || 'Ошибка при отправке на согласование');
    },
  });

  const handleRequestInfo = (values: RequestInfoRequest) => {
    requestInfoMutation.mutate(values);
  };

  const handleSendForApproval = (values: SendForApprovalRequest) => {
    sendForApprovalMutation.mutate(values);
  };

  const handleDecisionSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ['arbitrator-claims'] });
    onClose();
  };

  const tabItems = [
    {
      key: 'info',
      label: 'Информация',
      children: (
        <div>
          <Descriptions
            title="Основная информация"
            bordered
            column={2}
            size="small"
            className="arbitratorSectionSpacing"
          >
            <Descriptions.Item label="Номер обращения">
              <Text strong>#{claim.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Тип">
              <Tag color={getTypeColor(claim.type)}>{getTypeText(claim.type)}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Статус">
              <Tag
                color={
                  claim.status === 'new'
                    ? 'blue'
                    : claim.status === 'in_progress'
                    ? 'orange'
                    : claim.status === 'completed'
                    ? 'green'
                    : 'purple'
                }
              >
                {claim.status === 'new'
                  ? 'Новое'
                  : claim.status === 'in_progress'
                  ? 'В работе'
                  : claim.status === 'completed'
                  ? 'Завершено'
                  : 'Ожидает решения'}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Приоритет">
              <Tag color={getPriorityColor(claim.priority)}>
                {getPriorityText(claim.priority)}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Дата создания" span={2}>
              {dayjs(claim.created_at).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>

          <Title level={5}>
            <FileTextOutlined /> Информация о заказе
          </Title>
          <Descriptions bordered column={2} size="small" className="arbitratorSectionSpacing">
            <Descriptions.Item label="Номер заказа">
              <Text strong>#{claim.order.id}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Название">
              {claim.order.title}
            </Descriptions.Item>
            <Descriptions.Item label="Описание" span={2}>
              <Paragraph className="arbitratorParagraphReset">{claim.order.description}</Paragraph>
            </Descriptions.Item>
            <Descriptions.Item label="Сумма">
              <Text strong>{claim.order.amount.toLocaleString()} ₽</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Статус заказа">
              <Tag>{claim.order.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Дата создания заказа">
              {dayjs(claim.order.created_at).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
            <Descriptions.Item label="Срок выполнения">
              {dayjs(claim.order.deadline).format('DD.MM.YYYY HH:mm')}
            </Descriptions.Item>
          </Descriptions>

          <Title level={5}>
            <UserOutlined /> Информация о клиенте
          </Title>
          <Descriptions bordered column={2} size="small" className="arbitratorSectionSpacing">
            <Descriptions.Item label="Имя пользователя">
              {claim.client.username}
            </Descriptions.Item>
            <Descriptions.Item label="Email">
              {claim.client.email}
            </Descriptions.Item>
            {claim.client.phone && (
              <Descriptions.Item label="Телефон" span={2}>
                {claim.client.phone}
              </Descriptions.Item>
            )}
          </Descriptions>

          {claim.expert && (
            <>
              <Title level={5}>
                <UserOutlined /> Информация об эксперте
              </Title>
              <Descriptions bordered column={2} size="small" className="arbitratorSectionSpacing">
                <Descriptions.Item label="Имя пользователя">
                  {claim.expert.username}
                </Descriptions.Item>
                <Descriptions.Item label="Email">
                  {claim.expert.email}
                </Descriptions.Item>
                {claim.expert.rating && (
                  <Descriptions.Item label="Рейтинг" span={2}>
                    <Text strong>{claim.expert.rating}</Text>
                  </Descriptions.Item>
                )}
              </Descriptions>
            </>
          )}

          <Title level={5}>История коммуникации</Title>
          {claim.messages && claim.messages.length > 0 ? (
            <Timeline className="arbitratorSectionSpacing">
              {claim.messages.map((message) => (
                <Timeline.Item key={message.id} color="blue">
                  <div>
                    <Text strong>{message.sender.username}</Text>
                    <Text type="secondary" className="arbitratorTimelineDate">
                      ({dayjs(message.created_at).format('DD.MM.YYYY HH:mm')})
                    </Text>
                    <Paragraph className="arbitratorParagraphTop">
                      {message.text}
                    </Paragraph>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Empty
              description="Сообщений нет"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              className="arbitratorSectionSpacing"
            />
          )}

          {claim.attachments && claim.attachments.length > 0 && (
            <>
              <Title level={5}>Прикрепленные файлы</Title>
              <Space direction="vertical" className="arbitratorSpaceFullSpacing">
                {claim.attachments.map((attachment) => (
                  <Alert
                    key={attachment.id}
                    message={
                      <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                        {attachment.name}
                      </a>
                    }
                    description={`Размер: ${(attachment.size / 1024).toFixed(2)} KB`}
                    type="info"
                    showIcon
                  />
                ))}
              </Space>
            </>
          )}

          {claim.type === 'refund' && 'requested_amount' in claim && (
            <>
              <Divider />
              <Title level={5}>Детали заявки на возврат</Title>
              <Alert
                message={`Запрошенная сумма возврата: ${(claim as any).requested_amount?.toLocaleString()} ₽`}
                description={(claim as any).reason || (claim as any).client_comments}
                type="warning"
                showIcon
                className="arbitratorAlertSpacing"
              />
            </>
          )}

          {claim.type === 'dispute' && 'conflict_type' in claim && (
            <>
              <Divider />
              <Title level={5}>Детали спора</Title>
              <Alert
                message={`Тип конфликта: ${(claim as any).conflict_type}`}
                description={
                  <div>
                    <Paragraph className="arbitratorParagraphBottom">
                      <Text strong>Причина отмены:</Text> {(claim as any).cancellation_reason}
                    </Paragraph>
                    <Paragraph className="arbitratorParagraphBottom">
                      <Text strong>Жалоба клиента:</Text> {(claim as any).client_complaint}
                    </Paragraph>
                    {(claim as any).expert_complaint && (
                      <Paragraph className="arbitratorParagraphReset">
                        <Text strong>Жалоба эксперта:</Text> {(claim as any).expert_complaint}
                      </Paragraph>
                    )}
                  </div>
                }
                type="error"
                showIcon
                className="arbitratorAlertSpacing"
              />
            </>
          )}

          
          {claim.decision && (
            <>
              <Divider />
              <Title level={5}>Решение арбитра</Title>
              <Descriptions bordered column={1} size="small" className="arbitratorSectionSpacing">
                <Descriptions.Item label="Тип решения">
                  <Tag color={
                    claim.decision.decision_type === 'full_refund' ? 'green' :
                    claim.decision.decision_type === 'partial_refund' ? 'blue' :
                    claim.decision.decision_type === 'no_refund' ? 'red' :
                    claim.decision.decision_type === 'revision' ? 'orange' : 'default'
                  }>
                    {claim.decision.decision_type === 'full_refund' ? 'Полный возврат' :
                     claim.decision.decision_type === 'partial_refund' ? 'Частичный возврат' :
                     claim.decision.decision_type === 'no_refund' ? 'Отказ в возврате' :
                     claim.decision.decision_type === 'revision' ? 'Возврат на доработку' :
                     'Другое'}
                  </Tag>
                </Descriptions.Item>
                {claim.decision.refund_amount && (
                  <Descriptions.Item label="Сумма возврата">
                    <Text strong>{claim.decision.refund_amount.toLocaleString()} ₽</Text>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Обоснование">
                  <Paragraph className="arbitratorParagraphReset">{claim.decision.reasoning}</Paragraph>
                </Descriptions.Item>
                {claim.decision.client_comment && (
                  <Descriptions.Item label="Комментарий для клиента">
                    <Paragraph className="arbitratorParagraphReset">{claim.decision.client_comment}</Paragraph>
                  </Descriptions.Item>
                )}
                {claim.decision.expert_comment && (
                  <Descriptions.Item label="Комментарий для эксперта">
                    <Paragraph className="arbitratorParagraphReset">{claim.decision.expert_comment}</Paragraph>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Требуется согласование">
                  <Tag color={claim.decision.requires_approval ? 'orange' : 'green'}>
                    {claim.decision.requires_approval ? 'Да' : 'Нет'}
                  </Tag>
                </Descriptions.Item>
                {claim.decision.approval_status && (
                  <Descriptions.Item label="Статус согласования">
                    <Tag color={
                      claim.decision.approval_status === 'approved' ? 'green' :
                      claim.decision.approval_status === 'rejected' ? 'red' : 'orange'
                    }>
                      {claim.decision.approval_status === 'approved' ? 'Согласовано' :
                       claim.decision.approval_status === 'rejected' ? 'Отклонено' : 'Ожидает решения'}
                    </Tag>
                  </Descriptions.Item>
                )}
                {claim.decision.approval_comment && (
                  <Descriptions.Item label="Комментарий дирекции">
                    <Paragraph className="arbitratorParagraphReset">{claim.decision.approval_comment}</Paragraph>
                  </Descriptions.Item>
                )}
                <Descriptions.Item label="Дата решения">
                  {dayjs(claim.decision.created_at).format('DD.MM.YYYY HH:mm')}
                </Descriptions.Item>
              </Descriptions>
            </>
          )}
        </div>
      ),
    },
  ];

  if (showDecisionForm && claim.status !== 'completed') {
    tabItems.push({
      key: 'decision',
      label: 'Принять решение',
      children: (
        <DecisionForm
          claimId={claim.id}
          orderAmount={claim.order.amount}
          onSuccess={handleDecisionSuccess}
        />
      ),
    });

    tabItems.push({
      key: 'actions',
      label: 'Действия',
      children: (
        <div>
          <Space direction="vertical" className="arbitratorSpaceFull" size="large">
            <div>
              <Title level={5}>
                <QuestionCircleOutlined /> Запросить дополнительную информацию
              </Title>
              <Form
                form={requestInfoForm}
                layout="vertical"
                onFinish={handleRequestInfo}
              >
                <Form.Item
                  name="message"
                  label="Текст запроса"
                  rules={[{ required: true, message: 'Введите текст запроса' }]}
                >
                  <TextArea rows={4} placeholder="Опишите, какую информацию вам нужно получить..." />
                </Form.Item>
                <Form.Item
                  name="recipient"
                  label="Получатель"
                  rules={[{ required: true, message: 'Выберите получателя' }]}
                >
                  <Select placeholder="Выберите получателя">
                    <Option value="client">Клиент</Option>
                    <Option value="expert">Эксперт</Option>
                    <Option value="both">Оба</Option>
                  </Select>
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    htmlType="submit"
                    loading={requestInfoMutation.isPending}
                  >
                    Отправить запрос
                  </Button>
                </Form.Item>
              </Form>
            </div>

            <Divider />

            <div>
              <Title level={5}>
                <SendOutlined /> Отправить на согласование дирекции
              </Title>
              <Form
                form={approvalForm}
                layout="vertical"
                onFinish={handleSendForApproval}
              >
                <Form.Item
                  name="message"
                  label="Сообщение дирекции"
                  rules={[{ required: true, message: 'Введите сообщение для дирекции' }]}
                >
                  <TextArea
                    rows={4}
                    placeholder="Опишите, почему это обращение требует согласования дирекции..."
                  />
                </Form.Item>
                <Form.Item>
                  <Button
                    type="primary"
                    icon={<SendOutlined />}
                    htmlType="submit"
                    loading={sendForApprovalMutation.isPending}
                  >
                    Отправить на согласование
                  </Button>
                </Form.Item>
              </Form>
            </div>
          </Space>
        </div>
      ),
    });
  }

  return (
    <Modal
      title={`Обращение #${claim.id}`}
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="close" onClick={onClose}>
          Закрыть
        </Button>,
        onTakeClaim && claim.status === 'new' && (
          <Button
            key="take"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={onTakeClaim}
          >
            Взять в работу
          </Button>
        ),
      ].filter(Boolean)}
    >
      <div className="arbitratorTabsContainer">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </div>
    </Modal>
  );
};

export default ClaimDetails;
