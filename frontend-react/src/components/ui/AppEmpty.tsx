import React from 'react';
import { Empty, EmptyProps } from 'antd';
import styles from './AppEmpty.module.css';

export interface AppEmptyProps extends EmptyProps {
  // Add variants if needed later
}

export const AppEmpty: React.FC<AppEmptyProps> = ({ className, ...props }) => {
  return <Empty className={`${styles.empty} ${className || ''}`} {...props} />;
};
