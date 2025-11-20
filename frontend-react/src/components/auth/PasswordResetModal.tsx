import React from 'react';
import { Modal, Input, Button } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';

interface PasswordResetModalProps {
  open: boolean;
  step: 'email' | 'code';
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
  onResetPassword: () => void;
  onBackToEmail: () => void;
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
  onResetPassword,
  onBackToEmail,
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
    >
      {step === 'email' ? (
        <div>
          <p className="text-muted mb-3">
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
            block
            size="large"
            style={{ marginTop: '16px' }}
          >
            Отправить код
          </Button>
        </div>
      ) : (
        <div>
          <p className="text-muted mb-3">
            Введите 6-значный код из email и новый пароль
          </p>
          
          {/* Поля для ввода кода */}
          <div className="d-flex justify-content-center gap-2 mb-3">
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
                className="form-control text-center"
                style={{
                  width: '45px',
                  height: '50px',
                  fontSize: '24px',
                  fontWeight: 'bold',
                  border: '2px solid #d9d9d9',
                  borderRadius: '8px',
                }}
              />
            ))}
          </div>

          {/* Поля для нового пароля */}
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

          {/* Кнопки */}
          <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
            <Button onClick={onBackToEmail} disabled={loading}>
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
