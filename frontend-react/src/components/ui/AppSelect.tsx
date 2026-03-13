import React from 'react';
import { Select, SelectProps } from 'antd';
import styles from './AppSelect.module.css';

export interface AppSelectProps extends Omit<SelectProps, 'variant'> {
  variant?: 'default' | 'filled';
}

const getClasses = (className: string = '', variant: string = 'default') => {
    return [
        styles.select,
        styles[variant],
        className
    ].filter(Boolean).join(' ');
};

const AppSelectComponent: React.FC<AppSelectProps> = ({ 
  className = '', 
  variant = 'default', 
  popupClassName = '',
  ...props 
}) => {
  return (
    <Select 
      className={getClasses(className, variant)} 
      popupClassName={`${styles.popup} ${popupClassName}`}
      {...props} 
    />
  );
};

export const AppSelect = AppSelectComponent as typeof AppSelectComponent & {
  Option: typeof Select.Option;
};

AppSelect.Option = Select.Option;
