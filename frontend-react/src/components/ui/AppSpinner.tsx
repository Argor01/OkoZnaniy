import React from 'react';
import { Spin, SpinProps } from 'antd';
import styles from './AppSpinner.module.css';

export type AppSpinnerProps = SpinProps;

export const AppSpinner: React.FC<AppSpinnerProps> = ({ className, ...props }) => {
  return <Spin className={`${styles.spinner} ${className || ''}`} {...props} />;
};
