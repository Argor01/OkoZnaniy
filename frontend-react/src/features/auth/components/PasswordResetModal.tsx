import React, { useEffect, useRef, useState } from 'react';
import { Modal, Input, Button } from 'antd';
import { MailOutlined, LockOutlined } from '@ant-design/icons';
import styles from './PasswordResetModal.module.css';

const MOBILE_BREAKPOINT = 576;

interface PasswordResetModalProps {
  open: boolean;
  step: 'email' | 'code' | 'password';
  email: string;
  code: string[];
  newPassword: string;
  confirmPassword: string;
  loading: boolean;
  cooldown?: number;
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
  cooldown = 0,
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

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
      width={isMobile ? '100%' : 500}
      wrapClassName={styles.modalWrap}
      centered
      maskClosable={false}
      keyboard={false}
      styles={{
        content: { borderRadius: isMobile ? 20 : 24, overflow: 'hidden' },
        header: { borderRadius: `${isMobile ? 20 : 24}px ${isMobile ? 20 : 24}px 0 0` },
        body: { borderRadius: `0 0 ${isMobile ? 20 : 24}px ${isMobile ? 20 : 24}px` },
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
            disabled={cooldown > 0}
            onClick={onRequestCode}
            size="large"
            block
          >
            {cooldown > 0 ? `Отправить повторно (${cooldown} сек.)` : 'Отправить код'}
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

          <div className={styles.actionsRow} style={isMobile ? { flexDirection: 'column-reverse', gap: 10 } : undefined}>
            <Button onClick={onBackToEmail} disabled={loading} block={isMobile}>
              Назад
            </Button>
            <Button
              type="primary"
              loading={loading}
              onClick={onVerifyCode}
              size="large"
              block
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

          <div className={styles.actionsRow} style={isMobile ? { flexDirection: 'column-reverse', gap: 10 } : undefined}>
            <Button onClick={onBackToCode} disabled={loading} block={isMobile}>
              Назад
            </Button>
            <Button
              type="primary"
              loading={loading}
              onClick={onResetPassword}
              size="large"
              block
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
