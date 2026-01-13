import React, { useState } from 'react';
import { Modal, Typography } from 'antd';
import { 
  TrophyOutlined,
  ClockCircleOutlined,
  FileDoneOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  CalendarOutlined,
  DollarOutlined,
  PaperClipOutlined
} from '@ant-design/icons';
import { ArbitrationCase } from '../types';

const { Text, Paragraph } = Typography;

interface ArbitrationModalProps {
  visible: boolean;
  onClose: () => void;
  cases: ArbitrationCase[];
  isMobile: boolean;
  isDesktop?: boolean;
}

const ArbitrationModal: React.FC<ArbitrationModalProps> = ({
  visible,
  onClose,
  cases,
  isMobile,
  isDesktop = true
}) => {
  const [arbitrationStatusFilter, setArbitrationStatusFilter] = useState<string>('all');

  return (
    <Modal
      title={null}
      open={visible}
      onCancel={onClose}
      footer={null}
      width="auto"
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        content: { 
          borderRadius: isMobile ? 0 : 24, 
          padding: 0,
          margin: isMobile ? 0 : 'auto',
          overflow: 'hidden',
          background: '#ffffff',
          boxShadow: isMobile ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.15)',
          maxHeight: isMobile ? '100vh' : 'auto',
          top: isMobile ? 0 : '60px',
          left: isMobile ? 0 : (isDesktop ? '280px' : '250px'),
          right: isMobile ? 0 : '20px',
          bottom: isMobile ? 0 : '20px',
          width: isMobile ? '100vw !important' : (isDesktop ? 'calc(100vw - 300px)' : 'calc(100vw - 270px)'),
          height: isMobile ? '100vh !important' : 'calc(100vh - 80px)',
          transform: 'none',
          position: 'fixed'
        },
        header: {
          display: 'none'
        },
        body: {
          padding: 0,
          margin: 0,
          background: '#ffffff',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }
      }}
    >
      <div style={{ 
        background: '#f3f4f6',
        height: '100%',
        padding: isMobile ? '16px' : '32px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Заголовок */}
        <Text strong style={{ 
          fontSize: isMobile ? 20 : 24, 
          color: '#1f2937', 
          display: 'block', 
          marginBottom: isMobile ? 16 : 24 
        }}>
          Арбитраж
        </Text>

        {/* Фильтр статусов */}
        <div style={{ 
          display: 'flex', 
          gap: 0,
          background: '#f9fafb',
          borderRadius: isMobile ? 8 : 12,
          padding: '4px',
          border: '1px solid #e5e7eb',
          overflowX: isMobile ? 'auto' : 'visible',
          flexWrap: isMobile ? 'nowrap' : 'wrap',
          marginBottom: isMobile ? 16 : 24
        }}>
          <div
            onClick={() => setArbitrationStatusFilter('all')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '12px 8px',
              cursor: 'pointer',
              borderRadius: 8,
              background: arbitrationStatusFilter === 'all' ? '#ffffff' : 'transparent',
              borderBottom: arbitrationStatusFilter === 'all' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <TrophyOutlined style={{ 
              fontSize: 16, 
              color: arbitrationStatusFilter === 'all' ? '#3b82f6' : '#6b7280' 
            }} />
            <Text style={{ 
              fontSize: 12, 
              color: arbitrationStatusFilter === 'all' ? '#1f2937' : '#6b7280',
              fontWeight: arbitrationStatusFilter === 'all' ? 500 : 400,
              whiteSpace: 'nowrap'
            }}>
              Все
            </Text>
          </div>
          <div
            onClick={() => setArbitrationStatusFilter('pending')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '12px 8px',
              cursor: 'pointer',
              borderRadius: 8,
              background: arbitrationStatusFilter === 'pending' ? '#ffffff' : 'transparent',
              borderBottom: arbitrationStatusFilter === 'pending' ? '2px solid #f59e0b' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <ClockCircleOutlined style={{ 
              fontSize: 16, 
              color: arbitrationStatusFilter === 'pending' ? '#f59e0b' : '#6b7280' 
            }} />
            <Text style={{ 
              fontSize: 12, 
              color: arbitrationStatusFilter === 'pending' ? '#1f2937' : '#6b7280',
              fontWeight: arbitrationStatusFilter === 'pending' ? 500 : 400,
              whiteSpace: 'nowrap'
            }}>
              Ожидает
            </Text>
          </div>
          <div
            onClick={() => setArbitrationStatusFilter('in_review')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '12px 8px',
              cursor: 'pointer',
              borderRadius: 8,
              background: arbitrationStatusFilter === 'in_review' ? '#ffffff' : 'transparent',
              borderBottom: arbitrationStatusFilter === 'in_review' ? '2px solid #3b82f6' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <FileDoneOutlined style={{ 
              fontSize: 16, 
              color: arbitrationStatusFilter === 'in_review' ? '#3b82f6' : '#6b7280' 
            }} />
            <Text style={{ 
              fontSize: 12, 
              color: arbitrationStatusFilter === 'in_review' ? '#1f2937' : '#6b7280',
              fontWeight: arbitrationStatusFilter === 'in_review' ? 500 : 400,
              whiteSpace: 'nowrap'
            }}>
              На рассмотрении
            </Text>
          </div>
          <div
            onClick={() => setArbitrationStatusFilter('resolved')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '12px 8px',
              cursor: 'pointer',
              borderRadius: 8,
              background: arbitrationStatusFilter === 'resolved' ? '#ffffff' : 'transparent',
              borderBottom: arbitrationStatusFilter === 'resolved' ? '2px solid #10b981' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <CheckCircleOutlined style={{ 
              fontSize: 16, 
              color: arbitrationStatusFilter === 'resolved' ? '#10b981' : '#6b7280' 
            }} />
            <Text style={{ 
              fontSize: 12, 
              color: arbitrationStatusFilter === 'resolved' ? '#1f2937' : '#6b7280',
              fontWeight: arbitrationStatusFilter === 'resolved' ? 500 : 400,
              whiteSpace: 'nowrap'
            }}>
              Решено
            </Text>
          </div>
          <div
            onClick={() => setArbitrationStatusFilter('rejected')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '12px 8px',
              cursor: 'pointer',
              borderRadius: 8,
              background: arbitrationStatusFilter === 'rejected' ? '#ffffff' : 'transparent',
              borderBottom: arbitrationStatusFilter === 'rejected' ? '2px solid #ef4444' : '2px solid transparent',
              transition: 'all 0.2s ease'
            }}
          >
            <CloseCircleOutlined style={{ 
              fontSize: 16, 
              color: arbitrationStatusFilter === 'rejected' ? '#ef4444' : '#6b7280' 
            }} />
            <Text style={{ 
              fontSize: 12, 
              color: arbitrationStatusFilter === 'rejected' ? '#1f2937' : '#6b7280',
              fontWeight: arbitrationStatusFilter === 'rejected' ? 500 : 400,
              whiteSpace: 'nowrap'
            }}>
              Отклонено
            </Text>
          </div>
        </div>

        {/* Область контента */}
        <div style={{ 
          background: '#ffffff',
          borderRadius: 12,
          border: '1px solid #e5e7eb',
          padding: '16px',
          minHeight: '350px'
        }}>
          {(cases || []).filter(arbitration => {
            if (arbitrationStatusFilter === 'all') return true;
            return arbitration.status === arbitrationStatusFilter;
          }).length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {(cases || [])
                .filter(arbitration => {
                  if (arbitrationStatusFilter === 'all') return true;
                  return arbitration.status === arbitrationStatusFilter;
                })
                .map((arbitration) => {
                const getStatusConfig = (status: string) => {
                  switch (status) {
                    case 'pending':
                      return { color: '#f59e0b', bg: '#fef3c7', text: 'Ожидает рассмотрения', icon: <ClockCircleOutlined /> };
                    case 'in_review':
                      return { color: '#3b82f6', bg: '#dbeafe', text: 'На рассмотрении', icon: <FileDoneOutlined /> };
                    case 'resolved':
                      return { color: '#10b981', bg: '#d1fae5', text: 'Решено', icon: <CheckCircleOutlined /> };
                    case 'rejected':
                      return { color: '#ef4444', bg: '#fee2e2', text: 'Отклонено', icon: <CloseCircleOutlined /> };
                    default:
                      return { color: '#6b7280', bg: '#f3f4f6', text: 'Неизвестно', icon: <QuestionCircleOutlined /> };
                  }
                };

                const statusConfig = getStatusConfig(arbitration.status);

                return (
                  <div
                    key={arbitration.id}
                    style={{
                      padding: isMobile ? '16px' : '20px',
                      background: '#ffffff',
                      borderRadius: isMobile ? 8 : 12,
                      border: '1px solid #e5e7eb',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (!isMobile) {
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
                        e.currentTarget.style.transform = 'translateY(-2px)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isMobile) {
                        e.currentTarget.style.boxShadow = 'none';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }
                    }}
                  >
                    {/* Заголовок и статус */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'flex-start', 
                      marginBottom: 12,
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? 8 : 0
                    }}>
                      <div style={{ flex: 1, width: isMobile ? '100%' : 'auto' }}>
                        <Text strong style={{ 
                          fontSize: isMobile ? 14 : 16, 
                          color: '#1f2937', 
                          display: 'block', 
                          marginBottom: 4,
                          lineHeight: 1.4
                        }}>
                          Заказ #{arbitration.orderId}: {arbitration.orderTitle}
                        </Text>
                        <Text type="secondary" style={{ fontSize: isMobile ? 12 : 13 }}>
                          Заказчик: {arbitration.clientName}
                        </Text>
                      </div>
                      <div style={{
                        padding: isMobile ? '4px 10px' : '6px 12px',
                        borderRadius: 8,
                        background: statusConfig.bg,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        marginLeft: isMobile ? 0 : 16,
                        alignSelf: isMobile ? 'flex-start' : 'auto'
                      }}>
                        <span style={{ color: statusConfig.color, fontSize: isMobile ? 12 : 14 }}>
                          {statusConfig.icon}
                        </span>
                        <Text style={{ fontSize: isMobile ? 11 : 13, color: statusConfig.color, fontWeight: 500 }}>
                          {statusConfig.text}
                        </Text>
                      </div>
                    </div>

                    {/* Причина */}
                    <div style={{ 
                      padding: '12px', 
                      background: '#fef3c7', 
                      borderRadius: 8, 
                      marginBottom: 12,
                      borderLeft: '3px solid #f59e0b'
                    }}>
                      <Text strong style={{ fontSize: 13, color: '#92400e', display: 'block', marginBottom: 4 }}>
                        Причина претензии:
                      </Text>
                      <Text style={{ fontSize: 13, color: '#78350f' }}>
                        {arbitration.reason}
                      </Text>
                    </div>

                    {/* Описание */}
                    <Paragraph 
                      ellipsis={{ rows: 2, expandable: true, symbol: 'Показать больше' }}
                      style={{ fontSize: 14, color: '#4b5563', marginBottom: 12 }}
                    >
                      {arbitration.description}
                    </Paragraph>

                    {/* Решение (если есть) */}
                    {arbitration.decision && (
                      <div style={{ 
                        padding: '12px', 
                        background: arbitration.status === 'resolved' ? '#d1fae5' : '#fee2e2', 
                        borderRadius: 8, 
                        marginBottom: 12,
                        borderLeft: `3px solid ${arbitration.status === 'resolved' ? '#10b981' : '#ef4444'}`
                      }}>
                        <Text strong style={{ 
                          fontSize: 13, 
                          color: arbitration.status === 'resolved' ? '#065f46' : '#991b1b', 
                          display: 'block', 
                          marginBottom: 4 
                        }}>
                          Решение арбитража:
                        </Text>
                        <Text style={{ 
                          fontSize: 13, 
                          color: arbitration.status === 'resolved' ? '#047857' : '#b91c1c' 
                        }}>
                          {arbitration.decision}
                        </Text>
                      </div>
                    )}

                    {/* Документы */}
                    {arbitration.documents && arbitration.documents.length > 0 && (
                      <div style={{ marginBottom: 12 }}>
                        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
                          Прикрепленные документы:
                        </Text>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {arbitration.documents.map((doc, index) => (
                            <div
                              key={index}
                              style={{
                                padding: '6px 12px',
                                background: '#f3f4f6',
                                borderRadius: 6,
                                fontSize: 12,
                                color: '#4b5563',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                              }}
                            >
                              <PaperClipOutlined style={{ fontSize: 12 }} />
                              {doc}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Футер с информацией */}
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: isMobile ? 'flex-start' : 'center',
                      paddingTop: 12,
                      borderTop: '1px solid #e5e7eb',
                      flexDirection: isMobile ? 'column' : 'row',
                      gap: isMobile ? 12 : 0
                    }}>
                      <div style={{ display: 'flex', gap: isMobile ? 12 : 16, flexDirection: isMobile ? 'column' : 'row', width: isMobile ? '100%' : 'auto' }}>
                        <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, whiteSpace: 'nowrap' }}>
                          <CalendarOutlined style={{ marginRight: 4 }} />
                          Создано: {arbitration.createdAt}
                        </Text>
                        <Text type="secondary" style={{ fontSize: isMobile ? 11 : 12, whiteSpace: 'nowrap' }}>
                          <ClockCircleOutlined style={{ marginRight: 4 }} />
                          Обновлено: {arbitration.updatedAt}
                        </Text>
                      </div>
                      <Text strong style={{ fontSize: isMobile ? 16 : 15, color: '#1f2937', whiteSpace: 'nowrap' }}>
                        <DollarOutlined style={{ marginRight: 4 }} />
                        {arbitration.amount.toLocaleString('ru-RU')} ₽
                      </Text>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '48px 24px',
              minHeight: '350px'
            }}>
              <TrophyOutlined style={{ fontSize: 48, color: '#d1d5db', marginBottom: 16 }} />
              <Text type="secondary" style={{ fontSize: 14, color: '#6b7280' }}>
                {arbitrationStatusFilter === 'all' 
                  ? 'У вас нет арбитражей' 
                  : `Нет арбитражей со статусом "${
                      arbitrationStatusFilter === 'pending' ? 'Ожидает рассмотрения' :
                      arbitrationStatusFilter === 'in_review' ? 'На рассмотрении' :
                      arbitrationStatusFilter === 'resolved' ? 'Решено' :
                      arbitrationStatusFilter === 'rejected' ? 'Отклонено' : ''
                    }"`
                }
              </Text>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ArbitrationModal;
