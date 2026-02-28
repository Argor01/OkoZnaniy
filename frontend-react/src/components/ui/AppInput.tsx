import React from 'react';
import { Input, InputProps, InputNumber, InputNumberProps } from 'antd';
import { TextAreaProps } from 'antd/es/input';
import { SearchProps } from 'antd/es/input';
import { PasswordProps } from 'antd/es/input';
import styles from './AppInput.module.css';

export interface AppInputProps extends Omit<InputProps, 'variant'> {
  variant?: 'default' | 'filled';
}

const getClasses = (className: string = '', variant: string = 'default') => {
    return [
        styles.input,
        styles[variant],
        className
    ].filter(Boolean).join(' ');
};

const AppInputComponent: React.FC<AppInputProps> = ({ 
  className = '', 
  variant = 'default', 
  ...props 
}) => {
  return <Input className={getClasses(className, variant)} {...props} />;
};

const AppTextArea: React.FC<Omit<TextAreaProps, 'variant'> & { variant?: 'default' | 'filled' }> = ({
    className = '',
    variant = 'default',
    ...props
}) => {
    return <Input.TextArea className={getClasses(className, variant)} {...props} />;
};

const AppPassword: React.FC<Omit<PasswordProps, 'variant'> & { variant?: 'default' | 'filled' }> = ({
    className = '',
    variant = 'default',
    ...props
}) => {
    return <Input.Password className={getClasses(className, variant)} {...props} />;
};

const AppSearch: React.FC<Omit<SearchProps, 'variant'> & { variant?: 'default' | 'filled' }> = ({
    className = '',
    variant = 'default',
    ...props
}) => {
    return <Input.Search className={getClasses(className, variant)} {...props} />;
};

const AppInputNumber: React.FC<Omit<InputNumberProps, 'variant'> & { variant?: 'default' | 'filled' }> = ({
    className = '',
    variant = 'default',
    ...props
}) => {
    return <InputNumber className={getClasses(className, variant)} {...props} />;
};

type AppInputType = typeof AppInputComponent & {
  TextArea: typeof AppTextArea;
  Password: typeof AppPassword;
  Search: typeof AppSearch;
  Number: typeof AppInputNumber;
};

export const AppInput = AppInputComponent as AppInputType;

AppInput.TextArea = AppTextArea;
AppInput.Password = AppPassword;
AppInput.Search = AppSearch;
AppInput.Number = AppInputNumber;
