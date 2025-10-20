import React from 'react';
import { Form, Input } from 'antd';
import { Rule } from 'antd/lib/form';

interface FormFieldProps {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  rules?: Rule[];
  placeholder?: string;
}

export const FormField: React.FC<FormFieldProps> = ({
  name,
  label,
  type = 'text',
  required = false,
  rules = [],
  placeholder,
}: FormFieldProps) => {
  const defaultRules = required
    ? [{ required: true, message: `Пожалуйста, введите ${label.toLowerCase()}` }]
    : [];

  const fieldRules = [...defaultRules, ...rules];

  const renderInput = () => {
    switch (type) {
      case 'password':
        return <Input.Password placeholder={placeholder} />;
      case 'textarea':
        return <Input.TextArea rows={4} placeholder={placeholder} />;
      default:
        return <Input type={type} placeholder={placeholder} />;
    }
  };

  return (
    <Form.Item name={name} label={label} rules={fieldRules}>
      {renderInput()}
    </Form.Item>
  );
}; 