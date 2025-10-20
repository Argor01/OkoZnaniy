import React, { useState } from 'react';
import { Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { RcFile } from 'antd/lib/upload';
import { apiClient } from '@/api/client';

const { Dragger } = Upload;

interface FileUploadProps {
  onSuccess?: (fileUrl: string) => void;
  onError?: (error: Error) => void;
  maxSize?: number; // в мегабайтах
  accept?: string;
  multiple?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onSuccess,
  onError,
  maxSize = 10,
  accept = '.doc,.docx,.pdf,.txt',
  multiple = false,
}) => {
  const [uploading, setUploading] = useState(false);

  const beforeUpload = (file: RcFile) => {
    const isValidType = accept.split(',').some(type => 
      file.type.toLowerCase().includes(type.trim().replace('.', ''))
    );
    
    if (!isValidType) {
      message.error(`${file.name} не является допустимым типом файла`);
      return false;
    }

    const isValidSize = file.size / 1024 / 1024 < maxSize;
    if (!isValidSize) {
      message.error(`${file.name} должен быть меньше ${maxSize}MB`);
      return false;
    }

    return true;
  };

  const customRequest = async (options: any) => {
    const { file, onSuccess: onUploadSuccess, onError: onUploadError } = options;

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/api/files/upload/', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      onUploadSuccess(response.data, file);
      onSuccess?.(response.data.url);
      message.success(`${file.name} успешно загружен`);
    } catch (error: any) {
      onUploadError(error);
      onError?.(error);
      message.error(`Ошибка при загрузке ${file.name}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Dragger
      name="file"
      multiple={multiple}
      beforeUpload={beforeUpload}
      customRequest={customRequest}
      showUploadList={true}
      disabled={uploading}
    >
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">
        Нажмите или перетащите файл в эту область для загрузки
      </p>
      <p className="ant-upload-hint">
        Поддерживаемые форматы: {accept}. Максимальный размер: {maxSize}MB
      </p>
    </Dragger>
  );
}; 