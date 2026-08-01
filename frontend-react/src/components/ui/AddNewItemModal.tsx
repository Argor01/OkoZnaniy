import React, { useState, useCallback } from 'react';
import { Modal, message } from 'antd';
import { AppInput } from './AppInput';

export interface AddNewItemModalProps {
  open: boolean;
  title: string;
  placeholder: string;
  emptyMessage: string;
  onOk: (normalizedName: string) => void;
  onCancel: () => void;
  confirmLoading?: boolean;
}

const normalizeName = (name: string): string =>
  name
    .trim()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');

export const AddNewItemModal: React.FC<AddNewItemModalProps> = ({
  open,
  title,
  placeholder,
  emptyMessage,
  onOk,
  onCancel,
  confirmLoading = false,
}) => {
  const [value, setValue] = useState('');

  const handleOk = useCallback(() => {
    if (value.trim()) {
      onOk(normalizeName(value));
    } else {
      message.error(emptyMessage);
    }
  }, [value, onOk, emptyMessage]);

  const handleCancel = useCallback(() => {
    setValue('');
    onCancel();
  }, [onCancel]);

  const handlePressEnter = useCallback(() => {
    if (value.trim()) {
      onOk(normalizeName(value));
    }
  }, [value, onOk]);

  return (
    <Modal
      title={title}
      open={open}
      onOk={handleOk}
      onCancel={handleCancel}
      confirmLoading={confirmLoading}
    >
      <AppInput
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onPressEnter={handlePressEnter}
      />
    </Modal>
  );
};
