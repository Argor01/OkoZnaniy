import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Typography } from 'antd';
import styles from './EmailVerificationModal.module.css';

const MOBILE_BREAKPOINT = 576;
const CODE_LENGTH = 6;

interface EmailVerificationModalProps {
  open: boolean;
  email?: string;
  code: string[];
  loading?: boolean;
  onChangeCode: (index: number, value: string) => void;
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
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (!open) return;
    const timeout = setTimeout(() => firstInputRef.current?.focus(), 100);
    return () => clearTimeout(timeout);
  }, [open]);

  const focusInput = (index: number) => {
    document.getElementById(`verify-code-${index}`)?.focus();
  };

  const handlePasteDigits = (value: string, startIndex = 0) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH - startIndex).split('');
    if (digits.length === 0) return;

    digits.forEach((digit, idx) => {
      const targetIndex = startIndex + idx;
      if (targetIndex < CODE_LENGTH) {
        onChangeCode(targetIndex, digit);
      }
    });

    focusInput(Math.min(startIndex + digits.length, CODE_LENGTH - 1));
  };

  const handlePaste = (event: React.ClipboardEvent, index = 0) => {
    event.preventDefault();
    handlePasteDigits(event.clipboardData.getData('text'), index);
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !code[index] && index > 0) {
      focusInput(index - 1);
    }
    if (event.key === 'ArrowLeft' && index > 0) {
      focusInput(index - 1);
    }
    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    const onlyDigits = value.replace(/[^0-9]/g, '');
    if (onlyDigits.length > 1) {
      handlePasteDigits(onlyDigits, index);
      return;
    }

    onChangeCode(index, onlyDigits);
    if (onlyDigits && index < CODE_LENGTH - 1) {
      focusInput(index + 1);
    }
  };

  return (
    <Modal
      open={open}
      title="Подтверждение email"
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      wrapClassName={styles.modalWrap}
      width={isMobile ? '100%' : 480}
      centered
      maskClosable={false}
      keyboard={false}
    >
      <div className={styles.body}>
        <Typography.Paragraph className={styles.description}>
          На адрес <b>{email}</b> отправлен код подтверждения. Введите его ниже, чтобы завершить регистрацию.
        </Typography.Paragraph>

        <div className={styles.codeRow} onPaste={handlePaste}>
          {code.map((digit, index) => (
            <input
              key={index}
              ref={index === 0 ? firstInputRef : undefined}
              id={`verify-code-${index}`}
              type="text"
              inputMode="numeric"
              pattern="\d*"
              maxLength={1}
              value={digit}
              onChange={(event) => handleCodeInput(index, event.target.value)}
              onPaste={(event) => handlePaste(event, index)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              disabled={loading}
              className={styles.codeInput}
              aria-label={`Цифра ${index + 1}`}
            />
          ))}
        </div>

        <div className={styles.actions}>
          <div className={styles.actionsRight}>
            {onResend && (
              <Button onClick={onResend} disabled={loading} type="default" size="large">
                Отправить код снова
              </Button>
            )}
            <Button type="primary" onClick={onVerify} loading={loading} size="large">
              Подтвердить
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default EmailVerificationModal;
