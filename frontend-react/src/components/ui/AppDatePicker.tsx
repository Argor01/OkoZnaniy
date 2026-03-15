import React from 'react';
import { DatePicker, DatePickerProps } from 'antd';
import styles from './AppDatePicker.module.css';

export interface AppDatePickerProps extends Omit<DatePickerProps, 'variant'> {
  variant?: 'default' | 'filled';
}

const getClasses = (className: string = '', variant: string = 'default') => {
    return [
        styles.datePicker,
        styles[variant],
        className
    ].filter(Boolean).join(' ');
};

export const AppDatePicker: React.FC<AppDatePickerProps> = ({ 
  className = '', 
  variant = 'default', 
  ...props 
}) => {
  return (
    <DatePicker 
      className={getClasses(className, variant)} 
      {...props} 
    />
  );
};
