import React from 'react';
import {
  FileOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  FileImageOutlined,
  FileZipOutlined,
} from '@ant-design/icons';

export const truncateFileName = (name: string, maxLength: number = 20) => {
  if (name.length <= maxLength) return name;
  const extIndex = name.lastIndexOf('.');
  if (extIndex === -1) return name.substring(0, maxLength) + '...';
  
  const ext = name.substring(extIndex);
  const nameWithoutExt = name.substring(0, extIndex);
  
  const availableLength = maxLength - ext.length - 3; 
  if (availableLength <= 0) return name.substring(0, maxLength) + '...';
  
  return nameWithoutExt.substring(0, availableLength) + '...' + ext;
};

export const getFileIconByName = (fileName?: string | null) => {
  const value = String(fileName || '').toLowerCase();
  if (!value) return <FileOutlined />;
  if (value.endsWith('.pdf')) return <FilePdfOutlined />;
  if (value.endsWith('.doc') || value.endsWith('.docx')) return <FileWordOutlined />;
  if (value.endsWith('.jpg') || value.endsWith('.jpeg') || value.endsWith('.png') || value.endsWith('.webp') || value.endsWith('.gif')) return <FileImageOutlined />;
  if (value.endsWith('.zip') || value.endsWith('.rar') || value.endsWith('.7z')) return <FileZipOutlined />;
  return <FileOutlined />;
};
