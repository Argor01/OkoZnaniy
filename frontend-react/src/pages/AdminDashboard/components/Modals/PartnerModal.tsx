import React from 'react';
import { Modal, Form, InputNumber, Switch, Button, Row, Col, Typography, Divider, Tag } from 'antd';
import dayjs from 'dayjs';
import type { Partner, UpdatePartnerRequest } from '../../types';
import { MODAL_CONSTANTS } from '../../constants';
import styles from './PartnerModal.module.css';

const { Text, Title } = Typography;

interface PartnerModalProps {
  visible: boolean;
  partner: Partner | null;
  onCancel: () => void;
  onUpdate: (partnerId: number, data: UpdatePartnerRequest) => void;
  isUpdating?: boolean;
  mode: 'view' | 'edit';
}

/**
 * Модальное окно для просмотра и редактирования партнера
 */
export const PartnerModal: React.FC<PartnerModalProps> = ({
  visible,
  partner,
  onCancel,
  onUpdate,
  isUpdating = false,
  mode,
}) => {
  const [form] = Form.useForm();

  React.useEffect(() => {
    if (partner && visible) {
      form.setFieldsValue({
        partner_commission_rate: partner.partner_commission_rate,
        is_verified: partner.is_verified,
      });
    }
  }, [partner, visible, form]);

  const handleSubmit = async () => {
    if (!partner || mode === 'view') return;

    try {
      const values = await form.validateFields();
      onUpdate(partner.id, values);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onCancel();
  };

  if (!partner) return null;

  const isViewMode = mode === 'view';
  const title = isViewMode ? 'Информация о партнере' : 'Редактирование партнера';

  return (
    <Modal
      title={title}
      open={visible}
      onCancel={handleCancel}
      width={MODAL_CONSTANTS.LARGE_WIDTH}
      maskStyle={MODAL_CONSTANTS.MASK_STYLE}
      className={styles.partnerModal}
      footer={
        isViewMode ? [
          <Button key="close" onClick={handleCancel}>
            Закрыть
          </Button>,
        ] : [
          <Button key="cancel" onClick={handleCancel}>
            Отмена
          </Button>,
          <Button 
            key="submit" 
            type="primary" 
            loading={isUpdating}
            onClick={handleSubmit}
          >
            Сохранить
          </Button>,
        ]
      }
    >
      <div className={styles.modalContent}>
        {/* Основная информация */}
        <div className={styles.section}>
          <Title level={4}>Основная информация</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <div className={styles.infoItem}>
                <Text type="secondary">Имя пользователя:</Text>
                <Text strong>{partner.username}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className={styles.infoItem}>
                <Text type="secondary">Email:</Text>
                <Text strong>{partner.email}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className={styles.infoItem}>
                <Text type="secondary">Имя:</Text>
                <Text strong>{partner.first_name || 'Не указано'}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className={styles.infoItem}>
                <Text type="secondary">Фамилия:</Text>
                <Text strong>{partner.last_name || 'Не указано'}</Text>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className={styles.infoItem}>
                <Text type="secondary">Реферальный код:</Text>
                <Tag color="blue" className={styles.referralCode}>
                  {partner.referral_code}
                </Tag>
              </div>
            </Col>
            <Col xs={24} sm={12}>
              <div className={styles.infoItem}>
                <Text type="secondary">Дата регистрации:</Text>
                <Text strong>{dayjs(partner.date_joined).format('DD.MM.YYYY HH:mm')}</Text>
              </div>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Статистика */}
        <div className={styles.section}>
          <Title level={4}>Статистика</Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <div className={styles.statItem}>
                <Text type="secondary">Всего рефералов</Text>
                <div className={styles.statValue}>{partner.total_referrals}</div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className={styles.statItem}>
                <Text type="secondary">Активных рефералов</Text>
                <div className={styles.statValue}>{partner.active_referrals}</div>
              </div>
            </Col>
            <Col xs={24} sm={8}>
              <div className={styles.statItem}>
                <Text type="secondary">Общий доход</Text>
                <div className={styles.statValue}>{partner.total_earnings.toLocaleString()} ₽</div>
              </div>
            </Col>
          </Row>
        </div>

        <Divider />

        {/* Настройки */}
        <div className={styles.section}>
          <Title level={4}>Настройки</Title>
          <Form
            form={form}
            layout="vertical"
            className={styles.form}
          >
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="partner_commission_rate"
                  label="Процент комиссии (%)"
                  rules={[
                    { required: true, message: 'Укажите процент комиссии' },
                    { type: 'number', min: 0, max: 100, message: 'Процент должен быть от 0 до 100' },
                  ]}
                >
                  <InputNumber
                    style={{ width: '100%' }}
                    min={0}
                    max={100}
                    step={0.1}
                    precision={1}
                    disabled={isViewMode}
                    addonAfter="%"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="is_verified"
                  label="Статус верификации"
                  valuePropName="checked"
                >
                  <Switch
                    disabled={isViewMode}
                    checkedChildren="Верифицирован"
                    unCheckedChildren="Не верифицирован"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </div>

        {/* Дополнительная информация */}
        {isViewMode && (
          <>
            <Divider />
            <div className={styles.section}>
              <Title level={4}>Дополнительная информация</Title>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <div className={styles.infoItem}>
                    <Text type="secondary">Средний доход с реферала:</Text>
                    <Text strong>
                      {partner.total_referrals > 0 
                        ? Math.round(partner.total_earnings / partner.total_referrals).toLocaleString()
                        : 0
                      } ₽
                    </Text>
                  </div>
                </Col>
                <Col xs={24} sm={12}>
                  <div className={styles.infoItem}>
                    <Text type="secondary">Процент активных рефералов:</Text>
                    <Text strong>
                      {partner.total_referrals > 0 
                        ? Math.round((partner.active_referrals / partner.total_referrals) * 100)
                        : 0
                      }%
                    </Text>
                  </div>
                </Col>
              </Row>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};