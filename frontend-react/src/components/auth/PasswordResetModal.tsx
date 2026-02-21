import React from 'react';
import { Modal, Input, Button } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';

interface PasswordResetModalProps {
  open: boolean;
  step: 'email' | 'code' | 'password';
  email: string;
  code: string[];
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  onEmailChange: (email: string) => void;
  onCodeChange: (index: number, value: string) => void;
  onNewPasswordChange: (password: string) => void;
  onConfirmPasswordChange: (password: string) => void;
  onRequestCode: () => void;
  onVerifyCode: () => void;
  onResetPassword: () => void;
  onBackToEmail: () => void;
  onBackToCode: () => void;
  onGoToCodeStep: () => void;
  onCancel: () => void;
}

const PasswordResetModal: React.FC<PasswordResetModalProps> = ({
  open,
  step,
  email,
  code,
  newPassword,
  confirmPassword,
  loading,
  onEmailChange,
  onCodeChange,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onRequestCode,
  onVerifyCode,
  onResetPassword,
  onBackToEmail,
  onBackToCode,
  onGoToCodeStep,
  onCancel,
}) => {
  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`reset-code-${index - 1}`);
      if (prevInput) {
        (prevInput as HTMLInputElement).focus();
      }
    }
  };

  return (
    <Modal
      title="Восстановление пароля"
      open={open}
      onCancel={onCancel}
      footer={null}
      centered
      width={500}
      wrapClassName="password-reset-modal"
    >
      {step === 'email' ? (
        <div>
          <p className="text-muted" style={{ marginBottom: '5px' }}>
            Введите email для получения кода восстановления
          </p>
          <Input
            prefix={<MailOutlined />}
            placeholder="Email"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            onPressEnter={onRequestCode}
            size="large"
            disabled={loading}
          />
          <Button
            type="primary"
            loading={loading}
            onClick={onRequestCode}
            size="large"
            block
            style={{ marginTop: '16px' }}
          >
            Отправить код
          </Button>
        </div>
      ) : step === 'code' ? (
        <div>
          <p className="text-muted mb-3">
            Введите 6-значный код из email
          </p>
          
          
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            {code.map((digit, index) => (
              <input
                key={index}
                id={`reset-code-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => onCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                style={{
                  width: '45px',
                  height: '50px',
                  fontSize: '24px',
                  fontWeight: '500',
                  border: '2px solid #d9d9d9',
                  borderRadius: '8px',
                  textAlign: 'center',
                  lineHeight: '46px',
                  padding: '0',
                  outline: 'none',
                }}
              />
            ))}
          </div>

          
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <Button onClick={onBackToEmail} disabled={loading}>
              ← Назад
            </Button>
            <Button
              type="primary"
              loading={loading}
              onClick={onVerifyCode}
              style={{ flex: 1 }}
              size="large"
            >
              Подтвердить код
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-muted" style={{ marginBottom: '5px' }}>
            Введите новый пароль
          </p>

          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Новый пароль (минимум 8 символов)"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            size="large"
            disabled={loading}
            style={{ marginBottom: '12px' }}
          />
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Подтвердите пароль"
            value={confirmPassword}
            onChange={(e) => onConfirmPasswordChange(e.target.value)}
            onPressEnter={onResetPassword}
            size="large"
            disabled={loading}
          />

          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <Button onClick={onBackToCode} disabled={loading}>
              ← Назад
            </Button>
            <Button
              type="primary"
              loading={loading}
              onClick={onResetPassword}
              style={{ flex: 1 }}
              size="large"
            >
              Сбросить пароль
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default PasswordResetModal;
