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

const blockNonNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (
    e.key === 'e' || e.key === 'E' ||
    e.key === '+' || e.key === '-' ||
    e.key === '.' || e.key === ','
  ) {
    e.preventDefault();
  }
};

const filterNonNumericPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
  const paste = e.clipboardData.getData('text');
  if (!/^\d+$/.test(paste)) {
    e.preventDefault();
  }
};

const AppInputComponent: React.FC<AppInputProps> = ({ 
  className = '', 
  variant = 'default',
  onKeyDown,
  onPaste,
  ...props 
}) => {
  const isNumeric = props.type === 'number';
  return (
    <Input
      className={getClasses(className, variant)}
      onKeyDown={isNumeric ? (e) => { blockNonNumericKeys(e); onKeyDown?.(e); } : onKeyDown}
      onPaste={isNumeric ? (e) => { filterNonNumericPaste(e); onPaste?.(e); } : onPaste}
      {...props}
    />
  );
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
    onKeyDown,
    ...props
}) => {
    return (
        <InputNumber
            className={getClasses(className, variant)}
            onKeyDown={(e) => {
                blockNonNumericKeys(e);
                onKeyDown?.(e);
            }}
            {...props}
        />
    );
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
