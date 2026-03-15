import React from 'react';
import { Button, ButtonProps } from 'antd';
import styles from './AppButton.module.css';

export interface AppButtonProps extends Omit<ButtonProps, 'variant'> {
  variant?: 'primary' | 'secondary' | 'outline' | 'gradient' | 'danger' | 'success' | 'link' | 'text';
}

export const AppButton: React.FC<AppButtonProps> = ({ 
  children, 
  className = '', 
  variant = 'primary',
  type,
  ...props 
}) => {
  // Map our variants to Antd types where appropriate
  const getAntdType = (): ButtonProps['type'] => {
    if (variant === 'primary' || variant === 'gradient' || variant === 'success') return 'primary';
    if (variant === 'secondary') return 'default';
    if (variant === 'outline') return 'default';
    if (variant === 'danger') return 'primary';
    if (variant === 'link') return 'link';
    if (variant === 'text') return 'text';
    return type || 'default';
  };

  const buttonClasses = [
    styles.button,
    styles[variant],
    className
  ].filter(Boolean).join(' ');

  return (
    <Button 
      className={buttonClasses} 
      type={getAntdType()}
      danger={variant === 'danger'}
      {...props}
    >
      {children}
    </Button>
  );
};
