import React from 'react';
import { Modal, Typography, Select, DatePicker, Input, Button, Space } from 'antd';
import { DownOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatCurrency } from '../../../utils/formatters';

const { Text } = Typography;
const { RangePicker } = DatePicker;

type FinanceProfile = {
  balance?: number | string;
  frozen_balance?: number | string;
};

interface FinanceModalProps {
  visible: boolean;
  onClose: () => void;
  profile: FinanceProfile | null;
  isMobile: boolean;
}

const FinanceModal: React.FC<FinanceModalProps> = ({ visible, onClose, profile, isMobile }) => {
  const isDesktop = window.innerWidth > 1024;

  return (
    <Modal
      title={
        <div style={{ 
          fontSize: 24, 
          fontWeight: 600, 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: 8
        }}>
          Финансы
        </div>
      }
      open={visible}
      centered
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : (isDesktop ? 'calc(100vw - 300px)' : 'calc(100vw - 270px)')}
      styles={{
        mask: {
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          backgroundColor: 'rgba(0, 0, 0, 0.3)'
        },
        content: { 
          borderRadius: isMobile ? 0 : 24, 
          padding: isMobile ? '16px' : '32px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(10px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          margin: isMobile ? 0 : undefined,
          maxWidth: isMobile ? '100vw' : undefined,
          width: isMobile ? '100vw' : undefined,
          height: isMobile ? '100vh' : 'calc(100vh - 80px)'
        },
        body: {
          padding: '0',
          maxHeight: isMobile ? 'calc(100vh - 100px)' : '80vh',
          overflowY: 'auto'
        }
      }}
    >
      <div style={{ display: 'flex', gap: isMobile ? 16 : 24, minHeight: isMobile ? 'auto' : '600px', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 0, order: isMobile ? 2 : 1 }}>
          <Text strong style={{ fontSize: isMobile ? 18 : 20, color: '#1f2937', display: 'block', marginBottom: isMobile ? 16 : 20 }}>
            История операций
          </Text>

          <div style={{ display: 'flex', gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 24, flexWrap: 'wrap' }}>
            <Select
              defaultValue="all"
              style={{ width: isMobile ? '100%' : 180 }}
              suffixIcon={<DownOutlined />}
              size={isMobile ? 'middle' : 'middle'}
            >
              <Select.Option value="all">Все операции</Select.Option>
              <Select.Option value="income">Поступления</Select.Option>
              <Select.Option value="expense">Списания</Select.Option>
            </Select>
            
            <RangePicker
              defaultValue={[dayjs().startOf('month'), dayjs().endOf('month')]}
              format="DD.MM.YYYY"
              style={{ width: isMobile ? '100%' : 280 }}
              size={isMobile ? 'middle' : 'middle'}
            />

            <Input
              placeholder="Поиск по операциям"
              prefix={<SearchOutlined style={{ color: '#9ca3af' }} />}
              style={{ flex: 1, minWidth: isMobile ? '100%' : 200, maxWidth: isMobile ? '100%' : 400 }}
              size={isMobile ? 'middle' : 'middle'}
            />
          </div>

          <div style={{ 
            background: '#f9fafb', 
            borderRadius: 12, 
            padding: '16px', 
            marginBottom: 24,
            border: '1px solid #e5e7eb'
          }}>
            <Text strong style={{ fontSize: 14, color: '#1f2937', display: 'block', marginBottom: 12 }}>
              Операции за данный период:
            </Text>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>
                Всего заказов: <Text strong style={{ color: '#1f2937' }}>0</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>
                Выполнено заказов: <Text strong style={{ color: '#1f2937' }}>0</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>
                Поступлений: <Text strong style={{ color: '#10b981' }}>0</Text>
              </Text>
              <Text style={{ fontSize: 13, color: '#6b7280' }}>
                Списаний: <Text strong style={{ color: '#ef4444' }}>0</Text>
              </Text>
            </div>
          </div>

          <div style={{ 
            minHeight: '400px',
            background: '#ffffff',
            borderRadius: 12,
            border: '1px solid #e5e7eb',
            padding: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Text type="secondary" style={{ fontSize: 14 }}>
              Нет операций за выбранный период
            </Text>
          </div>
        </div>

        <div style={{ width: isMobile ? '100%' : 300, flexShrink: 0, order: isMobile ? 1 : 2 }}>
          <div style={{ 
            background: '#f9fafb', 
            borderRadius: isMobile ? 12 : 16, 
            padding: isMobile ? '16px' : '24px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ marginBottom: isMobile ? 16 : 24 }}>
              <Text style={{ fontSize: isMobile ? 13 : 14, color: '#6b7280', display: 'block', marginBottom: 8 }}>
                Текущий баланс:
              </Text>
              <Text strong style={{ fontSize: isMobile ? 28 : 32, color: '#1f2937', display: 'block', marginBottom: isMobile ? 12 : 16 }}>
                {formatCurrency(Number(profile?.balance ?? 0))}
              </Text>
              <Button 
                type="primary"
                block
                style={{
                  borderRadius: 8,
                  height: 40
                }}
              >
                Пополнить баланс
              </Button>
            </div>

            <div style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
                <div style={{ 
                  width: 12, 
                  height: 12, 
                  background: '#10b981', 
                  borderRadius: 2, 
                  marginRight: 8 
                }} />
                <Text style={{ fontSize: 13, color: '#6b7280' }}>Доступно к выводу:</Text>
              </div>
              <Text strong style={{ fontSize: 16, color: '#1f2937', marginLeft: 20, display: 'block' }}>
                {formatCurrency(Number(profile?.balance ?? 0))}
              </Text>

              <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, marginBottom: 12 }}>
                <div style={{ 
                  width: 12, 
                  height: 12, 
                  background: '#ef4444', 
                  borderRadius: 2, 
                  marginRight: 8 
                }} />
                <Text style={{ fontSize: 13, color: '#6b7280' }}>Заблокировано:</Text>
              </div>
              <Text strong style={{ fontSize: 16, color: '#1f2937', marginLeft: 20, display: 'block' }}>
                {formatCurrency(Number(profile?.frozen_balance ?? 0))}
              </Text>

              <div style={{ display: 'flex', alignItems: 'center', marginTop: 16, marginBottom: 12 }}>
                <div style={{ 
                  width: 12, 
                  height: 12, 
                  background: '#6b7280', 
                  borderRadius: 2, 
                  marginRight: 8 
                }} />
                <Text style={{ fontSize: 13, color: '#6b7280' }}>Удерживается:</Text>
              </div>
              <Text strong style={{ fontSize: 16, color: '#1f2937', marginLeft: 20, display: 'block' }}>
                {formatCurrency(0)}
              </Text>
            </div>

            <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: 16 }}>
              <Text strong style={{ fontSize: 14, color: '#1f2937', display: 'block', marginBottom: 12 }}>
                Быстрые ссылки:
              </Text>
              <Space direction="vertical" style={{ width: '100%' }} size={8}>
                <Button 
                  type="text" 
                  block 
                  style={{ textAlign: 'left', height: 36 }}
                >
                  История операций
                </Button>
                <Button 
                  type="text" 
                  block 
                  style={{ textAlign: 'left', height: 36 }}
                >
                  Заблокировано
                </Button>
                <Button 
                  type="text" 
                  block 
                  style={{ textAlign: 'left', height: 36 }}
                >
                  Удерживается
                </Button>
                <Button 
                  type="text" 
                  block 
                  style={{ textAlign: 'left', height: 36 }}
                >
                  Платные услуги
                </Button>
              </Space>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default FinanceModal;
