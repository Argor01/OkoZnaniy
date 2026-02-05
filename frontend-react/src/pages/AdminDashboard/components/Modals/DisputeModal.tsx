import React from 'react';
import { Modal, Button, Typography, Divider, Tag, Row, Col, Timeline, Alert } from 'antd';
import { 
  UserOutlined, 
  CheckCircleOutlined, 
  ClockCircleOutlined,
  ExclamationCircleOutlined 
} from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Dispute } from '../../types';
import { MODAL_CONSTANTS } from '../../constants';
import styles from './DisputeModal.module.css';

const { Text, Title, Paragraph } = Typography;

interface DisputeModalProps {
  visible: boolean;
  dispute: Dispute | null;
  onCancel: () => void;
  onAssignArbitrator?: (dispute: Dispute) => void;
  onResolveDispute?: (dispute: Dispute) => void;
}

/**
 * Модальное окно для просмотра деталей спора
 */
export const DisputeModal: React.FC<DisputeModalProps> = ({
  visible,
  dispute,
  onCancel,
  onAssignArbitrator,
  onResolveDispute,
}) => {
  if (!dispute) return null;

  const handleAssignArbitrator = () => {
    if (onAssignArbitrator) {
      onAssignArbitrator(dispute);
    }
  };

  const handleResolveDispute = () => {
    if (onResolveDispute) {
      onResolveDispute(dispute);
    }
  };

  // Создаем временную линию событий
  const timelineItems = [
    {
      color: 'red',
      dot: <ExclamationCircleOutlined />,
      children: (
        <div>
          <Text strong>Спор создан</Text>
          <br />
          <Text type="secondary">{dayjs(dispute.created_at).format('DD.MM.YYYY HH:mm')}</Text>
        </div>
      ),
    },
  ];

  if (dispute.arbitrator) {
    timelineItems.push({
      color: 'blue',
      dot: <UserOutlined />,
      children: (
        <div>
          <Text strong>Назначен арбитр: {dispute.arbitrator.username}</Text>
          <br />
          <Text type="secondary">Арбитр назначен для рассмотрения спора</Text>
        </div>
      ),
    });
  }

  if (dispute.resolved) {
    timelineItems.push({
      color: 'green',
      dot: <CheckCircleOutlined />,
      children: (
        <div>
          <Text strong>Спор решен</Text>
          <br />
          <Text type="secondary">Спор успешно разрешен</Text>
        </div>
      ),
    });
  }

  return (
    <Modal
      title={`Спор по заказу #${dispute.order.id}`}
      open={visible}
      onCancel={onCancel}
      width={MODAL_CONSTANTS.EXTRA_LARGE_WIDTH}
      maskStyle={MODAL_CONSTANTS.MASK_STYLE}
      className={styles.disputeModal}
      footer={[
        <Button key="close" onClick={onCancel}>
          Закрыть
        </Button>,
        !dispute.resolved && !dispute.arbitrator && onAssignArbitrator && (
          <Button 
            key="assign" 
            type="primary"
            icon={<UserOutlined />}
            onClick={handleAssignArbitrator}
          >
            Назначить арбитра
          </Button>
        ),
        !dispute.resolved && dispute.arbitrator && onResolveDispute && (
          <Button 
            key="resolve" 
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleResolveDispute}
          >
            Отметить как решенный
          </Button>
        ),
      ].filter(Boolean)}
    >
      <div className={styles.modalContent}>
        {/* Статус спора */}
        <div className={styles.statusSection}>
          <Tag 
            color={dispute.resolved ? 'green' : 'orange'} 
            icon={dispute.resolved ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
            className={styles.statusTag}
          >
            {dispute.resolved ? 'Решен' : 'В рассмотрении'}
          </Tag>
          {!dispute.arbitrator && !dispute.resolved && (
            <Alert
              message="Требуется назначение арбитра"
              description="Для рассмотрения спора необходимо назначить арбитра"
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
            />
          )}
        </div>

        <Divider />

        {/* Информация о заказе */}
        <div className={styles.section}>
          <Title level={4}>Информация о заказе</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <div className={styles.infoItem}>
                <Text type="secondary">ID заказа:</Text>
                <Text strong>#{dispute.order.id}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className={styles.infoItem}>
                <Text type="secondary">Название заказа:</Text>
                <Text strong>{dispute.order.title || 'Без названия'}</Text>
              </div>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Участники спора */}
        <div className={styles.section}>
          <Title level={4}>Участники спора</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <div className={styles.participantCard}>
                <div className={styles.participantHeader}>
                  <UserOutlined className={styles.participantIcon} />
                  <Text strong>Клиент</Text>
                </div>
                <div className={styles.participantInfo}>
                  <Text>{dispute.order.client.username}</Text>
                  {dispute.order.client.email && (
                    <Text type="secondary" className={styles.participantEmail}>
                      {dispute.order.client.email}
                    </Text>
                  )}
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className={styles.participantCard}>
                <div className={styles.participantHeader}>
                  <UserOutlined className={styles.participantIcon} />
                  <Text strong>Эксперт</Text>
                </div>
                <div className={styles.participantInfo}>
                  {dispute.order.expert ? (
                    <>
                      <Text>{dispute.order.expert.username}</Text>
                      {dispute.order.expert.email && (
                        <Text type="secondary" className={styles.participantEmail}>
                          {dispute.order.expert.email}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text type="secondary">Не назначен</Text>
                  )}
                </div>
              </div>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Причина спора */}
        <div className={styles.section}>
          <Title level={4}>Причина спора</Title>
          <div className={styles.reasonContainer}>
            <Paragraph className={styles.reasonText}>
              {dispute.reason}
            </Paragraph>
          </div>
        </div>

        {/* Арбитр */}
        {dispute.arbitrator && (
          <>
            <Divider />
            <div className={styles.section}>
              <Title level={4}>Назначенный арбитр</Title>
              <div className={styles.arbitratorCard}>
                <div className={styles.arbitratorInfo}>
                  <UserOutlined className={styles.arbitratorIcon} />
                  <div>
                    <Text strong>{dispute.arbitrator.username}</Text>
                    <br />
                    <Text type="secondary">
                      {dispute.arbitrator.first_name} {dispute.arbitrator.last_name}
                    </Text>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Решение спора */}
        {dispute.resolved && dispute.result && (
          <>
            <Divider />
            <div className={styles.section}>
              <Title level={4}>Решение спора</Title>
              <div className={styles.resultContainer}>
                <Paragraph className={styles.resultText}>
                  {dispute.result}
                </Paragraph>
              </div>
            </div>
          </>
        )}

        <Divider />

        {/* Временная линия */}
        <div className={styles.section}>
          <Title level={4}>История спора</Title>
          <Timeline items={timelineItems} className={styles.timeline} />
        </div>
      </div>
    </Modal>
  );
};