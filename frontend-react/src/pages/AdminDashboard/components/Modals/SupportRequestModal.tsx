import React, { useState } from 'react';
import { 
  Modal, 
  Card, 
  Avatar, 
  Typography, 
  Tag, 
  Button, 
  Input, 
  List, 
  Space, 
  Divider,
  Upload,
  message,
  Tooltip,
  Badge,
  type UploadProps
} from 'antd';
import type { UploadFile } from 'antd/es/upload/interface';
import { 
  UserOutlined, 
  ClockCircleOutlined, 
  SendOutlined,
  PaperClipOutlined,
  CheckCircleOutlined,
  PlayCircleOutlined,
  FileOutlined
} from '@ant-design/icons';
import { SupportRequest, SupportMessage } from '../../types/support.types';
import { formatRelativeTime, formatDate } from '../../utils/formatters';
import styles from './SupportRequestModal.module.css';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

interface SupportRequestModalProps {
  request: SupportRequest | null;
  messages: SupportMessage[];
  isOpen: boolean;
  onClose: () => void;
  onTakeRequest: (requestId: number) => Promise<boolean>;
  onCompleteRequest: (requestId: number) => Promise<boolean>;
  onSendMessage: (requestId: number, content: string, attachments?: File[]) => Promise<boolean>;
}

export const SupportRequestModal: React.FC<SupportRequestModalProps> = ({
  request,
  messages,
  isOpen,
  onClose,
  onTakeRequest,
  onCompleteRequest,
  onSendMessage
}) => {
  const [messageText, setMessageText] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const [taking, setTaking] = useState(false);
  const [completing, setCompleting] = useState(false);

  if (!request) return null;

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'red';
      case 'high': return 'orange';
      case 'medium': return 'blue';
      case 'low': return 'green';
      default: return 'default';
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'technical': return 'purple';
      case 'billing': return 'gold';
      case 'account': return 'cyan';
      case 'general': return 'default';
      default: return 'default';
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'technical': return 'Техническая';
      case 'billing': return 'Оплата';
      case 'account': return 'Аккаунт';
      case 'general': return 'Общий';
      default: return category;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'СРОЧНО';
      case 'high': return 'ВЫСОКИЙ';
      case 'medium': return 'СРЕДНИЙ';
      case 'low': return 'НИЗКИЙ';
      default: return priority.toUpperCase();
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() && attachments.length === 0) {
      message.warning('Введите сообщение или прикрепите файл');
      return;
    }

    setSending(true);
    try {
      const success = await onSendMessage(request.id, messageText, attachments);
      if (success) {
        setMessageText('');
        setAttachments([]);
        message.success('Сообщение отправлено');
      } else {
        message.error('Ошибка отправки сообщения');
      }
    } catch (error) {
      message.error('Ошибка отправки сообщения');
    } finally {
      setSending(false);
    }
  };

  const handleTakeRequest = async () => {
    setTaking(true);
    try {
      const success = await onTakeRequest(request.id);
      if (success) {
        message.success('Запрос взят в работу');
      } else {
        message.error('Ошибка при взятии запроса в работу');
      }
    } catch (error) {
      message.error('Ошибка при взятии запроса в работу');
    } finally {
      setTaking(false);
    }
  };

  const handleCompleteRequest = async () => {
    setCompleting(true);
    try {
      const success = await onCompleteRequest(request.id);
      if (success) {
        message.success('Запрос завершен');
        onClose();
      } else {
        message.error('Ошибка при завершении запроса');
      }
    } catch (error) {
      message.error('Ошибка при завершении запроса');
    } finally {
      setCompleting(false);
    }
  };

  const uploadProps: UploadProps = {
    beforeUpload: (file) => {
      setAttachments((prev) => [...prev, file as unknown as File]);
      return false;
    },
    onRemove: (file) => {
      const original = (file as UploadFile).originFileObj;
      if (!original) return;
      setAttachments((prev) => prev.filter((f) => f !== original));
    },
    fileList: attachments.map((file) => ({
      uid: file.name,
      name: file.name,
      status: 'done' as const,
    })),
  };

  return (
    <Modal
      title={null}
      open={isOpen}
      onCancel={onClose}
      footer={null}
      width={800}
      className={styles.modal}
      destroyOnClose
    >
      <div className={styles.container}>
        {/* Заголовок запроса */}
        <Card className={styles.header}>
          <div className={styles.requestInfo}>
            <div className={styles.customerInfo}>
              <Avatar
                src={request.customer.avatar}
                icon={<UserOutlined />}
                size={48}
              />
              <div className={styles.customerDetails}>
                <Title level={4} className={styles.customerName}>
                  {request.customer.name}
                </Title>
                <Text type="secondary">{request.customer.email}</Text>
              </div>
            </div>
            
            <div className={styles.requestMeta}>
              <Space wrap>
                <Tag color={getPriorityColor(request.priority)}>
                  {getPriorityLabel(request.priority)}
                </Tag>
                <Tag color={getCategoryColor(request.category)}>
                  {getCategoryLabel(request.category)}
                </Tag>
                <Badge 
                  status={request.status === 'open' ? 'processing' : 
                          request.status === 'in_progress' ? 'warning' : 'success'} 
                  text={
                    request.status === 'open' ? 'Открыт' :
                    request.status === 'in_progress' ? 'В работе' : 'Завершен'
                  }
                />
              </Space>
            </div>
          </div>

          <Title level={3} className={styles.requestTitle}>
            {request.title}
          </Title>

          <Paragraph className={styles.requestDescription}>
            {request.description}
          </Paragraph>

          <div className={styles.requestDetails}>
            <Space wrap>
              <Text type="secondary">
                <ClockCircleOutlined /> Создан: {formatDate(request.createdAt)}
              </Text>
              {request.lastMessageAt && (
                <Text type="secondary">
                  Последнее сообщение: {formatRelativeTime(request.lastMessageAt)}
                </Text>
              )}
              {request.assignedAdmin && (
                <Text type="secondary">
                  Исполнитель: {request.assignedAdmin.name}
                </Text>
              )}
            </Space>
          </div>

          {request.tags.length > 0 && (
            <div className={styles.tags}>
              {request.tags.map(tag => (
                <Tag key={tag}>
                  {tag}
                </Tag>
              ))}
            </div>
          )}
        </Card>

        {/* Сообщения */}
        <Card title="Переписка" className={styles.messages}>
          <List
            dataSource={messages}
            renderItem={(message) => (
              <List.Item className={styles.messageItem}>
                <div className={`${styles.message} ${
                  message.senderType === 'admin' ? styles.adminMessage : styles.customerMessage
                }`}>
                  <div className={styles.messageHeader}>
                    <Avatar
                      src={message.senderAvatar}
                      icon={<UserOutlined />}
                      size="small"
                    />
                    <Text strong>{message.senderName}</Text>
                    <Text type="secondary" className={styles.messageTime}>
                      {formatRelativeTime(message.createdAt)}
                    </Text>
                  </div>
                  <div className={styles.messageContent}>
                    {message.content}
                  </div>
                  {message.attachments && message.attachments.length > 0 && (
                    <div className={styles.messageAttachments}>
                      {message.attachments.map(attachment => (
                        <div key={attachment.id} className={styles.attachment}>
                          <FileOutlined />
                          <a href={attachment.url} target="_blank" rel="noopener noreferrer">
                            {attachment.name}
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </List.Item>
            )}
            locale={{ emptyText: 'Нет сообщений' }}
          />
        </Card>

        {/* Форма ответа */}
        {request.status !== 'completed' && (
          <Card className={styles.replyForm}>
            <TextArea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Введите ваш ответ..."
              rows={4}
              className={styles.messageInput}
            />
            
            <div className={styles.replyActions}>
              <div className={styles.attachments}>
                <Upload {...uploadProps} multiple showUploadList={false}>
                  <Button icon={<PaperClipOutlined />} type="text">
                    Прикрепить файл
                  </Button>
                </Upload>
                {attachments.length > 0 && (
                  <Text type="secondary">
                    Файлов: {attachments.length}
                  </Text>
                )}
              </div>

              <Space>
                {request.status === 'open' && (
                  <Button
                    type="default"
                    icon={<PlayCircleOutlined />}
                    loading={taking}
                    onClick={handleTakeRequest}
                  >
                    Взять в работу
                  </Button>
                )}
                
                {request.status === 'in_progress' && (
                  <Button
                    type="default"
                    icon={<CheckCircleOutlined />}
                    loading={completing}
                    onClick={handleCompleteRequest}
                  >
                    Завершить
                  </Button>
                )}

                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  loading={sending}
                  onClick={handleSendMessage}
                  disabled={!messageText.trim() && attachments.length === 0}
                >
                  Отправить
                </Button>
              </Space>
            </div>
          </Card>
        )}
      </div>
    </Modal>
  );
};
