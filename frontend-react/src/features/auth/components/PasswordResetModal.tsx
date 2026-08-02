import React, { useEffect, useRef } from 'react';
import { Modal, Input, Button } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import styles from './PasswordResetModal.module.css';

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
  onCodePaste: (digits: string[]) => void;
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
  onCodePaste,
  onNewPasswordChange,
  onConfirmPasswordChange,
  onRequestCode,
  onVerifyCode,
  onResetPassword,
  onBackToEmail,
  onBackToCode,
  onCancel,
}) => {
  const emailInputRef = useRef<any>(null);
  const firstCodeInputRef = useRef<HTMLInputElement>(null);
  const newPasswordInputRef = useRef<any>(null);

  useEffect(() => {
    if (!open) return;
    
    const timeout = setTimeout(() => {
      if (step === 'email' && emailInputRef.current) {
        emailInputRef.current.focus();
      } else if (step === 'code' && firstCodeInputRef.current) {
        firstCodeInputRef.current.focus();
      } else if (step === 'password' && newPasswordInputRef.current) {
        newPasswordInputRef.current.focus();
      }
    }, 100);
    
    return () => clearTimeout(timeout);
  }, [open, step]);

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`reset-code-${index - 1}`);
      prevInput?.focus();
    }
    
    if (e.key === 'ArrowLeft' && index > 0) {
      const prevInput = document.getElementById(`reset-code-${index - 1}`);
      prevInput?.focus();
    }
    
    if (e.key === 'ArrowRight' && index < code.length - 1) {
      const nextInput = document.getElementById(`reset-code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    const onlyDigits = value.replace(/[^0-9]/g, '');
    if (onlyDigits.length > 1) {
      handlePasteDigits(onlyDigits, index);
      return;
    }

    onCodeChange(index, onlyDigits);
    
    if (onlyDigits && index < code.length - 1) {
      const nextInput = document.getElementById(`reset-code-${index + 1}`);
      nextInput?.focus();
    }
    
    const newCode = [...code];
    newCode[index] = onlyDigits;
    if (newCode.every(digit => digit.length === 1)) {
      onVerifyCode();
    }
  };

  const handlePasteDigits = (value: string, startIndex = 0) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, code.length - startIndex).split('');
    if (digits.length === 0) return;

    const nextCode = [...code];
    digits.forEach((digit, idx) => {
      nextCode[startIndex + idx] = digit;
    });
    onCodePaste(nextCode);

    const nextIndex = startIndex + digits.length;
    if (nextIndex < code.length) {
      const nextInput = document.getElementById(`reset-code-${nextIndex}`);
      nextInput?.focus();
      return;
    }

    document.getElementById(`reset-code-${code.length - 1}`)?.focus();
  };

  const handlePasteCode = (e: React.ClipboardEvent, index = 0) => {
    e.preventDefault();
    handlePasteDigits(e.clipboardData.getData('text'), index);
  };

  return (
    <Modal
      title="Восстановление пароля"
      open={open}
      onCancel={onCancel}
      footer={null}
      width={500}
      wrapClassName={styles.modalWrap}
      centered
      maskClosable={false}
      keyboard={false}
      styles={{
        content: { borderRadius: 24, overflow: 'hidden' },
        header: { borderRadius: '24px 24px 0 0' },
        body: { borderRadius: '0 0 24px 24px' },
      }}
    >
      {step === 'email' && (
        <div className={styles.stepContainer}>
          <p className={styles.hintText}>
            Введите email для получения кода восстановления
          </p>
          <Input
            ref={emailInputRef}
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
          >
            Отправить код
          </Button>
        </div>
      )}

      {step === 'code' && (
        <div className={styles.stepContainer}>
          <p className={styles.hintText}>
            Введите 6-значный код из email
          </p>
          
          <div 
            className={styles.codeRow}
            onPaste={handlePasteCode}
          >
            {code.map((digit, index) => (
              <input
                key={index}
                ref={index === 0 ? firstCodeInputRef : undefined}
                id={`reset-code-${index}`}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeInput(index, e.target.value)}
                onPaste={(e) => handlePasteCode(e, index)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                disabled={loading}
                className={styles.codeInput}
                aria-label={`Цифра ${index + 1}`}
              />
            ))}
          </div>

          <div className={styles.actionsRow}>
            <Button onClick={onBackToEmail} disabled={loading}>
              ← Назад
            </Button>
            <Button
              type="primary"
              loading={loading}
              onClick={onVerifyCode}
              size="large"
            >
              Подтвердить код
            </Button>
          </div>
        </div>
      )}

      {step === 'password' && (
        <div className={styles.stepContainer}>
          <p className={styles.hintText}>
            Введите новый пароль
          </p>

          <Input.Password
            ref={newPasswordInputRef}
            prefix={<LockOutlined />}
            placeholder="Новый пароль (минимум 8 символов)"
            value={newPassword}
            onChange={(e) => onNewPasswordChange(e.target.value)}
            size="large"
            disabled={loading}
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

          <div className={styles.actionsRow}>
            <Button onClick={onBackToCode} disabled={loading}>
              ← Назад
            </Button>
            <Button
              type="primary"
              loading={loading}
              onClick={onResetPassword}
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
