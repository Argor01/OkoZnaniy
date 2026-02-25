import { useState, useCallback } from 'react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  content: string;
  type: 'info' | 'success' | 'warning' | 'error';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

interface ConfirmOptions {
  title: string;
  content: string;
  type?: 'info' | 'success' | 'warning' | 'error';
  confirmText?: string;
  cancelText?: string;
}

export const useConfirmModal = () => {
  const [modalProps, setModalProps] = useState<ConfirmModalProps>({
    isOpen: false,
    title: '',
    content: '',
    type: 'info',
    confirmText: 'Подтвердить',
    cancelText: 'Отмена',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalProps({
        isOpen: true,
        title: options.title,
        content: options.content,
        type: options.type || 'info',
        confirmText: options.confirmText || 'Подтвердить',
        cancelText: options.cancelText || 'Отмена',
        onConfirm: () => {
          setModalProps(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalProps(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  }, []);

  const close = useCallback(() => {
    setModalProps(prev => ({ ...prev, isOpen: false }));
  }, []);

  return {
    ...modalProps,
    confirm,
    close
  };
};