import React from 'react';
import { Card, CardProps } from 'antd';
import styles from './AppCard.module.css';

export interface AppCardProps extends CardProps {
  variant?: 'default' | 'elevated' | 'outlined' | 'gradient';
  fullHeight?: boolean;
}

export const AppCard: React.FC<AppCardProps> = ({ 
  children, 
  className = '', 
  variant = 'default',
  fullHeight = false,
  ...props 
}) => {
  const cardClasses = [
    styles.card,
    styles[variant],
    fullHeight ? styles.fullHeight : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <Card className={cardClasses} bordered={variant === 'outlined'} {...props}>
      {children}
    </Card>
  );
};
