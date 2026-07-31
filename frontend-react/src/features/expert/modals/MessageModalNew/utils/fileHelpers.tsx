import React from 'react';
import {
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileImageOutlined,
  FileZipOutlined,
} from '@ant-design/icons';
import { truncateFileName } from '@/utils/formatters';

export { truncateFileName };

export const getFileIconByName = (fileName?: string | null) => {
  const value = String(fileName || '').toLowerCase();
  if (!value) return <FileOutlined />;
  if (value.endsWith('.pdf')) return <FilePdfOutlined />;
  if (value.endsWith('.doc') || value.endsWith('.docx')) return <FileWordOutlined />;
  if (value.endsWith('.jpg') || value.endsWith('.jpeg') || value.endsWith('.png') || value.endsWith('.webp') || value.endsWith('.gif')) return <FileImageOutlined />;
  if (value.endsWith('.zip') || value.endsWith('.rar') || value.endsWith('.7z')) return <FileZipOutlined />;
  return <FileOutlined />;
};
