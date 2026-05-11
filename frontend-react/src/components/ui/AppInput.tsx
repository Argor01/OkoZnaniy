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

const ALLOWED_NUMERIC_CONTROL_KEYS = new Set([
  'Backspace', 'Delete', 'Tab', 'Escape', 'Enter',
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown',
  'Home', 'End', 'PageUp', 'PageDown',
]);

const blockNonNumericKeys = (e: React.KeyboardEvent<HTMLInputElement>) => {
  // Always allow Ctrl/Cmd combinations (copy, paste, select all, undo, etc.)
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }
  if (ALLOWED_NUMERIC_CONTROL_KEYS.has(e.key)) {
    return;
  }
  // Allow exactly one digit character; block everything else
  // (letters, punctuation, scientific notation, whitespace, etc.).
  if (e.key.length === 1 && /^[0-9]$/.test(e.key)) {
    return;
  }
  e.preventDefault();
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
    onPaste,
    ...props
}) => {
    return (
        <InputNumber
            className={getClasses(className, variant)}
            onKeyDown={(e) => {
                blockNonNumericKeys(e as React.KeyboardEvent<HTMLInputElement>);
                onKeyDown?.(e);
            }}
            onPaste={(e) => {
                filterNonNumericPaste(e as React.ClipboardEvent<HTMLInputElement>);
                onPaste?.(e);
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
