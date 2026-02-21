import React from 'react';
import { Modal, Button, Alert } from 'antd';
import { 
  ExclamationCircleOutlined, 
  CheckCircleOutlined, 
  InfoCircleOutlined,
  WarningOutlined 
} from '@ant-design/icons';
import { MODAL_CONSTANTS } from '../../constants';
import styles from './ConfirmModal.module.css';

export type ConfirmType = 'info' | 'success' | 'warning' | 'error';

interface ConfirmModalProps {
  visible: boolean;
  type?: ConfirmType;
  title: string;
  content: React.ReactNode;
  okText?: string;
  cancelText?: string;
  onOk: () => void | Promise<void>;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}


export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  type = 'info',
  title,
  content,
  okText = 'OK',
  cancelText = 'Отмена',
  onOk,
  onCancel,
  loading = false,
  danger = false,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleOutlined className={styles.successIcon} />;
      case 'warning':
        return <WarningOutlined className={styles.warningIcon} />;
      case 'error':
        return <ExclamationCircleOutlined className={styles.errorIcon} />;
      default:
        return <InfoCircleOutlined className={styles.infoIcon} />;
    }
  };

  const getAlertType = () => {
    switch (type) {
      case 'success':
        return 'success';
      case 'warning':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'info';
    }
  };

  const handleOk = async () => {
    try {
      await onOk();
    } catch (error) {
      console.error('Error in confirm action:', error);
    }
  };

  return (
    <Modal
      title={
        <div className={styles.titleContainer}>
          {getIcon()}
          <span className={styles.titleText}>{title}</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      width={MODAL_CONSTANTS.DEFAULT_WIDTH}
      maskStyle={MODAL_CONSTANTS.MASK_STYLE}
      className={`${styles.confirmModal} ${styles[type]}`}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {cancelText}
        </Button>,
        <Button 
          key="ok" 
          type="primary"
          danger={danger}
          loading={loading}
          onClick={handleOk}
        >
          {okText}
        </Button>,
      ]}
    >
      <div className={styles.modalContent}>
        <Alert
          message={content}
          type={getAlertType()}
          showIcon={false}
          className={styles.contentAlert}
        />
      </div>
    </Modal>
  );
};
