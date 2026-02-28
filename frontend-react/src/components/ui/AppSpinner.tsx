import React from 'react';
import { Spin, SpinProps } from 'antd';
import styles from './AppSpinner.module.css';

export interface AppSpinnerProps extends SpinProps {
  // Add variants if needed later
}

export const AppSpinner: React.FC<AppSpinnerProps> = ({ className, ...props }) => {
  return <Spin className={`${styles.spinner} ${className || ''}`} {...props} />;
};
