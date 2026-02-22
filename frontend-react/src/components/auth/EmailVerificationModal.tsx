import React from 'react';
import { Modal, Input, Button, Typography } from 'antd';

interface EmailVerificationModalProps {
  open: boolean;
  email?: string;
  code: string;
  loading?: boolean;
  onChangeCode: (value: string) => void;
  onVerify: () => void;
  onResend?: () => void;
  onCancel: () => void;
}

const EmailVerificationModal: React.FC<EmailVerificationModalProps> = ({
  open,
  email,
  code,
  loading = false,
  onChangeCode,
  onVerify,
  onResend,
  onCancel,
}) => {
  return (
    <Modal
      open={open}
      title="Подтверждение email"
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      wrapClassName="verification-modal"
    >
      <div className="verificationModalBody">
        <Typography.Paragraph>
          На адрес <b>{email}</b> отправлен код подтверждения. Введите его ниже, чтобы завершить регистрацию.
        </Typography.Paragraph>
        <Input
          placeholder="Код подтверждения"
          value={code}
          onChange={(e) => onChangeCode(e.target.value)}
          maxLength={8}
        />
        <div className="verificationActions">
          <Button onClick={onCancel} disabled={loading}>Отмена</Button>
          <div className="verificationActionsRight">
            {onResend && (
              <Button onClick={onResend} disabled={loading} type="default">Отправить код снова</Button>
            )}
            <Button type="primary" onClick={onVerify} loading={loading}>
              Подтвердить
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EmailVerificationModal;
