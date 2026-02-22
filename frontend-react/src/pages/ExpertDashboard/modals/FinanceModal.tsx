import React from 'react';
import { Modal, Typography, Select, DatePicker, Input, Button, Space } from 'antd';
import { DownOutlined, SearchOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { formatCurrency } from '../../../utils/formatters';
import styles from '../ExpertDashboard.module.css';

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
        <div className={styles.financeModalTitle}>
          Финансы
        </div>
      }
      open={visible}
      centered
      onCancel={onClose}
      footer={null}
      width={isMobile ? '100%' : (isDesktop ? 'calc(100vw - 300px)' : 'calc(100vw - 270px)')}
      wrapClassName={`${styles.financeModalWrap} ${isMobile ? styles.financeModalWrapMobile : styles.financeModalWrapDesktop}`}
    >
      <div className={`${styles.financeModalLayout} ${isMobile ? styles.financeModalLayoutMobile : styles.financeModalLayoutDesktop}`}>
        <div className={`${styles.financeModalMain} ${isMobile ? styles.financeModalMainMobile : styles.financeModalMainDesktop}`}>
          <Text strong className={`${styles.financeModalHeading} ${isMobile ? styles.financeModalHeadingMobile : styles.financeModalHeadingDesktop}`}>
            История операций
          </Text>

          <div className={`${styles.financeModalFilters} ${isMobile ? styles.financeModalFiltersMobile : styles.financeModalFiltersDesktop}`}>
            <Select
              defaultValue="all"
              className={`${styles.financeModalSelect} ${isMobile ? styles.financeModalSelectMobile : styles.financeModalSelectDesktop}`}
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
              className={`${styles.financeModalRange} ${isMobile ? styles.financeModalRangeMobile : styles.financeModalRangeDesktop}`}
              size={isMobile ? 'middle' : 'middle'}
            />

            <Input
              placeholder="Поиск по операциям"
              prefix={<SearchOutlined className={styles.financeModalSearchIcon} />}
              className={`${styles.financeModalSearch} ${isMobile ? styles.financeModalSearchMobile : styles.financeModalSearchDesktop}`}
              size={isMobile ? 'middle' : 'middle'}
            />
          </div>

          <div className={styles.financeModalSummary}>
            <Text strong className={styles.financeModalSummaryTitle}>
              Операции за данный период:
            </Text>
            <div className={styles.financeModalSummaryRow}>
              <Text className={styles.financeModalSummaryText}>
                Всего заказов: <Text strong className={styles.financeModalSummaryValue}>0</Text>
              </Text>
              <Text className={styles.financeModalSummaryText}>
                Выполнено заказов: <Text strong className={styles.financeModalSummaryValue}>0</Text>
              </Text>
              <Text className={styles.financeModalSummaryText}>
                Поступлений: <Text strong className={styles.financeModalSummarySuccess}>0</Text>
              </Text>
              <Text className={styles.financeModalSummaryText}>
                Списаний: <Text strong className={styles.financeModalSummaryDanger}>0</Text>
              </Text>
            </div>
          </div>

          <div className={styles.financeModalEmptyState}>
            <Text type="secondary" className={styles.financeModalEmptyText}>
              Нет операций за выбранный период
            </Text>
          </div>
        </div>

        <div className={`${styles.financeModalSidebar} ${isMobile ? styles.financeModalSidebarMobile : styles.financeModalSidebarDesktop}`}>
          <div className={`${styles.financeModalSidebarCard} ${isMobile ? styles.financeModalSidebarCardMobile : styles.financeModalSidebarCardDesktop}`}>
            <div className={`${styles.financeModalBalanceBlock} ${isMobile ? styles.financeModalBalanceBlockMobile : styles.financeModalBalanceBlockDesktop}`}>
              <Text className={`${styles.financeModalBalanceLabel} ${isMobile ? styles.financeModalBalanceLabelMobile : styles.financeModalBalanceLabelDesktop}`}>
                Текущий баланс:
              </Text>
              <Text strong className={`${styles.financeModalBalanceValue} ${isMobile ? styles.financeModalBalanceValueMobile : styles.financeModalBalanceValueDesktop}`}>
                {formatCurrency(Number(profile?.balance ?? 0))}
              </Text>
              <Button 
                type="primary"
                block
                className={styles.financeModalBalanceButton}
              >
                Пополнить баланс
              </Button>
            </div>

            <div className={styles.financeModalBreakdown}>
              <div className={styles.financeModalBreakdownRow}>
                <div className={`${styles.financeModalLegend} ${styles.financeModalLegendSuccess}`} />
                <Text className={styles.financeModalBreakdownLabel}>Доступно к выводу:</Text>
              </div>
              <Text strong className={styles.financeModalBreakdownValue}>
                {formatCurrency(Number(profile?.balance ?? 0))}
              </Text>

              <div className={styles.financeModalBreakdownRow}>
                <div className={`${styles.financeModalLegend} ${styles.financeModalLegendDanger}`} />
                <Text className={styles.financeModalBreakdownLabel}>Заблокировано:</Text>
              </div>
              <Text strong className={styles.financeModalBreakdownValue}>
                {formatCurrency(Number(profile?.frozen_balance ?? 0))}
              </Text>

              <div className={styles.financeModalBreakdownRow}>
                <div className={`${styles.financeModalLegend} ${styles.financeModalLegendMuted}`} />
                <Text className={styles.financeModalBreakdownLabel}>Удерживается:</Text>
              </div>
              <Text strong className={styles.financeModalBreakdownValue}>
                {formatCurrency(0)}
              </Text>
            </div>

            <div className={styles.financeModalQuickLinks}>
              <Text strong className={styles.financeModalQuickLinksTitle}>
                Быстрые ссылки:
              </Text>
              <Space direction="vertical" className={styles.financeModalQuickLinksList} size={8}>
                <Button 
                  type="text" 
                  block 
                  className={styles.financeModalQuickLinkButton}
                >
                  История операций
                </Button>
                <Button 
                  type="text" 
                  block 
                  className={styles.financeModalQuickLinkButton}
                >
                  Заблокировано
                </Button>
                <Button 
                  type="text" 
                  block 
                  className={styles.financeModalQuickLinkButton}
                >
                  Удерживается
                </Button>
                <Button 
                  type="text" 
                  block 
                  className={styles.financeModalQuickLinkButton}
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
