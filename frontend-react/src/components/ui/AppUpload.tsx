import React from 'react';
import { Upload, UploadProps } from 'antd';
import { DraggerProps } from 'antd/es/upload';
import styles from './AppUpload.module.css';

export interface AppUploadProps extends UploadProps {
  variant?: 'default' | 'card';
}

const getClasses = (className: string = '', variant: string = 'default') => {
    return [
        styles.upload,
        styles[variant],
        className
    ].filter(Boolean).join(' ');
};

const AppUploadComponent: React.FC<AppUploadProps> = ({ 
  className = '', 
  variant = 'default', 
  children,
  ...props 
}) => {
  return (
    <Upload className={getClasses(className, variant)} {...props}>
      {children}
    </Upload>
  );
};

const AppDragger: React.FC<DraggerProps & { variant?: 'default' | 'card' }> = ({
    className = '',
    variant = 'default',
    children,
    ...props
}) => {
    return (
        <Upload.Dragger className={getClasses(className, variant)} {...props}>
            {children}
        </Upload.Dragger>
    );
};

type AppUploadType = typeof AppUploadComponent & {
  Dragger: typeof AppDragger;
  LIST_IGNORE: typeof Upload.LIST_IGNORE;
};

export const AppUpload = AppUploadComponent as AppUploadType;

AppUpload.Dragger = AppDragger;
AppUpload.LIST_IGNORE = Upload.LIST_IGNORE;
