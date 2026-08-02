import React, { useEffect, useRef, useState } from 'react';
import { Modal, Button, Typography } from 'antd';
import styles from './EmailVerificationModal.module.css';

const MOBILE_BREAKPOINT = 576;

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
    const t = setTimeout(() => firstInputRef.current?.focus(), 100);
    return () => clearTimeout(t);
  }, [open]);

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      document.getElementById(`verify-code-${index - 1}`)?.focus();
    }
    if (e.key === 'ArrowLeft' && index > 0) {
      document.getElementById(`verify-code-${index - 1}`)?.focus();
    }
    if (e.key === 'ArrowRight' && index < 5) {
      document.getElementById(`verify-code-${index + 1}`)?.focus();
    }
  };

  const handleCodeInput = (index: number, value: string) => {
    const onlyDigits = value.replace(/[^0-9]/g, '');
    onChangeCode(index, onlyDigits);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const digits = e.clipboardData.getData('text').replace(/[^0-9]/g, '').slice(0, 6).split('');
    digits.forEach((d, i) => { if (i < 6) onChangeCode(i, d); });
    const next = digits.length < 6 ? digits.length : 5;
    document.getElementById(`verify-code-${next}`)?.focus();
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
              onChange={(e) => handleCodeInput(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
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
